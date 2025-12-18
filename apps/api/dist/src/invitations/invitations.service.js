"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var InvitationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
let InvitationsService = InvitationsService_1 = class InvitationsService {
    prisma;
    configService;
    logger = new common_1.Logger(InvitationsService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async createInvitation(companyId, inviterId, dto) {
        const inviterMembership = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: { userId: inviterId, companyId },
            },
        });
        if (!inviterMembership) {
            throw new common_1.ForbiddenException('You are not a member of this company');
        }
        if (inviterMembership.role !== client_1.MemberRole.OWNER &&
            inviterMembership.role !== client_1.MemberRole.ADMIN) {
            throw new common_1.ForbiddenException('Only Owners and Admins can invite members');
        }
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
                throw new common_1.ConflictException('User is already a member of this company');
            }
        }
        const existingInvitation = await this.prisma.invitation.findUnique({
            where: {
                email_companyId: { email: dto.email, companyId },
            },
        });
        if (existingInvitation && existingInvitation.status === client_1.InvitationStatus.PENDING) {
            throw new common_1.ConflictException('An invitation is already pending for this email');
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const invitation = await this.prisma.invitation.upsert({
            where: {
                email_companyId: { email: dto.email, companyId },
            },
            update: {
                role: dto.role || client_1.MemberRole.BOARD_MEMBER,
                title: dto.title,
                status: client_1.InvitationStatus.PENDING,
                invitedBy: inviterId,
                expiresAt,
            },
            create: {
                email: dto.email,
                companyId,
                role: dto.role || client_1.MemberRole.BOARD_MEMBER,
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
    async listInvitations(companyId, userId) {
        const membership = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: { userId, companyId },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this company');
        }
        return this.prisma.invitation.findMany({
            where: { companyId },
            include: {
                inviter: { select: { firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async revokeInvitation(invitationId, userId) {
        const invitation = await this.prisma.invitation.findUnique({
            where: { id: invitationId },
        });
        if (!invitation) {
            throw new common_1.NotFoundException('Invitation not found');
        }
        const membership = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: { userId, companyId: invitation.companyId },
            },
        });
        if (!membership ||
            (membership.role !== client_1.MemberRole.OWNER && membership.role !== client_1.MemberRole.ADMIN)) {
            throw new common_1.ForbiddenException('Only Owners and Admins can revoke invitations');
        }
        return this.prisma.invitation.update({
            where: { id: invitationId },
            data: { status: client_1.InvitationStatus.REVOKED },
        });
    }
    async acceptInvitationByEmail(email, userId) {
        const invitations = await this.prisma.invitation.findMany({
            where: {
                email,
                status: client_1.InvitationStatus.PENDING,
                expiresAt: { gt: new Date() },
            },
        });
        if (invitations.length === 0) {
            this.logger.log(`No pending invitations found for ${email}`);
            return [];
        }
        const results = [];
        for (const invitation of invitations) {
            const member = await this.prisma.companyMember.create({
                data: {
                    userId,
                    companyId: invitation.companyId,
                    role: invitation.role,
                    title: invitation.title,
                    status: client_1.MemberStatus.ACTIVE,
                },
            });
            await this.prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: client_1.InvitationStatus.ACCEPTED },
            });
            this.logger.log(`User ${userId} accepted invitation to company ${invitation.companyId}`);
            results.push(member);
        }
        return results;
    }
};
exports.InvitationsService = InvitationsService;
exports.InvitationsService = InvitationsService = InvitationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], InvitationsService);
//# sourceMappingURL=invitations.service.js.map