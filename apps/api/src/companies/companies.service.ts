import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole, MemberStatus } from '@prisma/client';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  AddMemberDto,
  UpdateMemberDto,
} from './dto';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new company with the creator as OWNER
   * Only users who are already owners of at least one company can create new companies
   */
  async create(userId: string, createCompanyDto: CreateCompanyDto) {
    this.logger.log(`Creating company for user ${userId}: ${createCompanyDto.name}`);

    // First, ensure the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    this.logger.log(`User lookup result: ${user ? 'found' : 'not found'}`);

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      throw new BadRequestException('User not found');
    }

    // Check if user is already an owner of at least one company
    // Exception: Allow creating the first company in the system (bootstrap case)
    const existingOwnership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        role: MemberRole.OWNER,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!existingOwnership) {
      // Check if this is a bootstrap case (no companies exist yet)
      const totalCompanies = await this.prisma.company.count();
      if (totalCompanies > 0) {
        this.logger.warn(`User ${userId} is not an owner of any company, cannot create new companies`);
        throw new ForbiddenException('Only owners can create new companies. Please contact an administrator.');
      }
      this.logger.log(`Bootstrap case: allowing first company creation for user ${userId}`);
    }

    // Create company and add creator as owner in a transaction
    const company = await this.prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: createCompanyDto.name,
          logo: createCompanyDto.logo,
          timezone: createCompanyDto.timezone || 'Asia/Dubai',
          fiscalYearStart: createCompanyDto.fiscalYearStart || 1,
        },
      });

      // Add creator as owner
      await tx.companyMember.create({
        data: {
          userId,
          companyId: newCompany.id,
          role: MemberRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });

      return newCompany;
    });

    // Return company with members
    return this.prisma.company.findUnique({
      where: { id: company.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all companies where the user is a member
   */
  async findUserCompanies(userId: string) {
    return this.prisma.company.findMany({
      where: {
        members: {
          some: {
            userId,
            status: MemberStatus.ACTIVE,
          },
        },
      },
      include: {
        members: {
          where: {
            status: MemberStatus.ACTIVE,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            meetings: true,
            documents: true,
            actionItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single company by ID
   */
  async findOne(companyId: string, userId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            meetings: true,
            documents: true,
            actionItems: true,
            resolutions: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user is a member
    const membership = await this.getUserMembership(companyId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    return company;
  }

  /**
   * Update company details (admin or owner only)
   */
  async update(
    companyId: string,
    userId: string,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user is admin or owner
    await this.checkAdminAccess(companyId, userId);

    // Update company
    return this.prisma.company.update({
      where: { id: companyId },
      data: updateCompanyDto,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Add a member to the company
   */
  async addMember(
    companyId: string,
    userId: string,
    addMemberDto: AddMemberDto,
  ) {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user is admin or owner
    await this.checkAdminAccess(companyId, userId);

    // Check if the user to be added exists
    const userToAdd = await this.prisma.user.findUnique({
      where: { id: addMemberDto.userId },
    });

    if (!userToAdd) {
      throw new BadRequestException('User to add not found');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: addMemberDto.userId,
          companyId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this company');
    }

    // Add member
    const member = await this.prisma.companyMember.create({
      data: {
        userId: addMemberDto.userId,
        companyId,
        role: addMemberDto.role || MemberRole.BOARD_MEMBER,
        title: addMemberDto.title,
        termStart: addMemberDto.termStart
          ? new Date(addMemberDto.termStart)
          : undefined,
        termEnd: addMemberDto.termEnd
          ? new Date(addMemberDto.termEnd)
          : undefined,
        status: MemberStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });

    return member;
  }

  /**
   * Update a member's role or details (admin or owner only)
   */
  async updateMember(
    companyId: string,
    memberId: string,
    userId: string,
    updateMemberDto: UpdateMemberDto,
  ) {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user is admin or owner
    const currentUserMembership = await this.checkAdminAccess(companyId, userId);

    // Check if member exists
    const memberToUpdate = await this.prisma.companyMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToUpdate || memberToUpdate.companyId !== companyId) {
      throw new NotFoundException('Member not found');
    }

    // Prevent non-owners from modifying owner roles
    if (
      memberToUpdate.role === MemberRole.OWNER &&
      currentUserMembership.role !== MemberRole.OWNER
    ) {
      throw new ForbiddenException('Only owners can modify other owners');
    }

    // Prevent changing role to owner unless current user is owner
    if (
      updateMemberDto.role === MemberRole.OWNER &&
      currentUserMembership.role !== MemberRole.OWNER
    ) {
      throw new ForbiddenException('Only owners can assign owner role');
    }

    // Update member
    return this.prisma.companyMember.update({
      where: { id: memberId },
      data: {
        role: updateMemberDto.role,
        title: updateMemberDto.title,
        termStart: updateMemberDto.termStart
          ? new Date(updateMemberDto.termStart)
          : undefined,
        termEnd: updateMemberDto.termEnd
          ? new Date(updateMemberDto.termEnd)
          : undefined,
        status: updateMemberDto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  /**
   * Remove a member from the company (admin or owner only)
   */
  async removeMember(companyId: string, memberId: string, userId: string) {
    // Check if company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check if user is admin or owner
    const currentUserMembership = await this.checkAdminAccess(companyId, userId);

    // Check if member exists
    const memberToRemove = await this.prisma.companyMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove || memberToRemove.companyId !== companyId) {
      throw new NotFoundException('Member not found');
    }

    // Prevent removing owners unless current user is also an owner
    if (
      memberToRemove.role === MemberRole.OWNER &&
      currentUserMembership.role !== MemberRole.OWNER
    ) {
      throw new ForbiddenException('Only owners can remove other owners');
    }

    // Prevent removing the last owner
    if (memberToRemove.role === MemberRole.OWNER) {
      const ownerCount = await this.prisma.companyMember.count({
        where: {
          companyId,
          role: MemberRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner of the company',
        );
      }
    }

    // Prevent users from removing themselves
    if (memberToRemove.userId === userId) {
      throw new BadRequestException('You cannot remove yourself from the company');
    }

    // Delete the member
    await this.prisma.companyMember.delete({
      where: { id: memberId },
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Helper: Get user's membership in a company
   */
  private async getUserMembership(companyId: string, userId: string) {
    return this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
  }

  /**
   * Helper: Check if user has admin access (OWNER or ADMIN role)
   */
  private async checkAdminAccess(companyId: string, userId: string) {
    const membership = await this.getUserMembership(companyId, userId);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    if (
      membership.role !== MemberRole.OWNER &&
      membership.role !== MemberRole.ADMIN
    ) {
      throw new ForbiddenException(
        'You must be an owner or admin to perform this action',
      );
    }

    return membership;
  }

  /**
   * Get dashboard statistics for a company
   */
  async getDashboardStats(companyId: string, userId: string) {
    // Verify user is a member
    const membership = await this.getUserMembership(companyId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }

    const now = new Date();

    // Get all stats in parallel
    const [
      upcomingMeetingsCount,
      openActionItemsCount,
      pendingResolutionsCount,
      boardMembersCount,
      upcomingMeetings,
      userActionItems,
    ] = await Promise.all([
      // Upcoming meetings count
      this.prisma.meeting.count({
        where: {
          companyId,
          status: 'SCHEDULED',
          scheduledAt: { gte: now },
        },
      }),
      // Open action items count
      this.prisma.actionItem.count({
        where: {
          companyId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      // Pending resolutions count
      this.prisma.resolution.count({
        where: {
          companyId,
          status: { in: ['DRAFT', 'PROPOSED'] },
        },
      }),
      // Board members count
      this.prisma.companyMember.count({
        where: {
          companyId,
          status: MemberStatus.ACTIVE,
        },
      }),
      // Upcoming meetings list (next 5)
      this.prisma.meeting.findMany({
        where: {
          companyId,
          status: 'SCHEDULED',
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: {
          attendees: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      imageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // User's action items (assigned to them)
      this.prisma.actionItem.findMany({
        where: {
          companyId,
          assigneeId: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: [
          { dueDate: 'asc' },
          { priority: 'desc' },
        ],
        take: 5,
      }),
    ]);

    return {
      stats: {
        upcomingMeetings: upcomingMeetingsCount,
        openActionItems: openActionItemsCount,
        pendingResolutions: pendingResolutionsCount,
        boardMembers: boardMembersCount,
      },
      upcomingMeetings,
      userActionItems,
    };
  }
}
