import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MemberRole, MemberStatus, InvitationStatus, CompanyMember } from '@prisma/client';
import { CreateInvitationDto } from './dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createInvitation(
    companyId: string,
    inviterId: string,
    dto: CreateInvitationDto,
  ) {
    // Verify inviter has permission (Owner or Admin)
    const inviterMembership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId: inviterId, companyId },
      },
    });

    if (!inviterMembership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    if (
      inviterMembership.role !== MemberRole.OWNER &&
      inviterMembership.role !== MemberRole.ADMIN
    ) {
      throw new ForbiddenException('Only Owners and Admins can invite members');
    }

    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.companyMember.findUnique({
        where: {
          userId_companyId: { userId: existingUser.id, companyId },
        },
      });

      if (existingMember) {
        throw new ConflictException('User is already a member of this company');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.prisma.invitation.findUnique({
      where: {
        email_companyId: { email: dto.email, companyId },
      },
    });

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Create or update invitation (7-day expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.upsert({
      where: {
        email_companyId: { email: dto.email, companyId },
      },
      update: {
        role: dto.role || MemberRole.BOARD_MEMBER,
        title: dto.title,
        status: InvitationStatus.PENDING,
        invitedBy: inviterId,
        expiresAt,
      },
      create: {
        email: dto.email,
        companyId,
        role: dto.role || MemberRole.BOARD_MEMBER,
        title: dto.title,
        invitedBy: inviterId,
        expiresAt,
      },
      include: {
        company: { select: { id: true, name: true } },
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    this.logger.log(`Invitation created for ${dto.email} to company ${companyId}`);

    return invitation;
  }

  async listInvitations(companyId: string, userId: string) {
    // Verify user has access
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    return this.prisma.invitation.findMany({
      where: { companyId },
      include: {
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify user has permission
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: { userId, companyId: invitation.companyId },
      },
    });

    if (
      !membership ||
      (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN)
    ) {
      throw new ForbiddenException('Only Owners and Admins can revoke invitations');
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }

  async acceptInvitationByEmail(email: string, userId: string) {
    // Find all pending invitations for this email
    const invitations = await this.prisma.invitation.findMany({
      where: {
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (invitations.length === 0) {
      this.logger.log(`No pending invitations found for ${email}`);
      return [];
    }

    const results: CompanyMember[] = [];

    for (const invitation of invitations) {
      // Create company membership
      const member = await this.prisma.companyMember.create({
        data: {
          userId,
          companyId: invitation.companyId,
          role: invitation.role,
          title: invitation.title,
          status: MemberStatus.ACTIVE,
        },
      });

      // Mark invitation as accepted
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      });

      this.logger.log(
        `User ${userId} accepted invitation to company ${invitation.companyId}`,
      );

      results.push(member);
    }

    return results;
  }
}
