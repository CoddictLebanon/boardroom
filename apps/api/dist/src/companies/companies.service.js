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
var CompaniesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let CompaniesService = CompaniesService_1 = class CompaniesService {
    prisma;
    logger = new common_1.Logger(CompaniesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createCompanyDto) {
        this.logger.log(`Creating company for user ${userId}: ${createCompanyDto.name}`);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        this.logger.log(`User lookup result: ${user ? 'found' : 'not found'}`);
        if (!user) {
            this.logger.error(`User not found: ${userId}`);
            throw new common_1.BadRequestException('User not found');
        }
        const company = await this.prisma.$transaction(async (tx) => {
            const newCompany = await tx.company.create({
                data: {
                    name: createCompanyDto.name,
                    logo: createCompanyDto.logo,
                    timezone: createCompanyDto.timezone || 'Asia/Dubai',
                    fiscalYearStart: createCompanyDto.fiscalYearStart || 1,
                },
            });
            await tx.companyMember.create({
                data: {
                    userId,
                    companyId: newCompany.id,
                    role: client_1.MemberRole.OWNER,
                    status: client_1.MemberStatus.ACTIVE,
                },
            });
            return newCompany;
        });
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
    async findUserCompanies(userId) {
        return this.prisma.company.findMany({
            where: {
                members: {
                    some: {
                        userId,
                        status: client_1.MemberStatus.ACTIVE,
                    },
                },
            },
            include: {
                members: {
                    where: {
                        status: client_1.MemberStatus.ACTIVE,
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
    async findOne(companyId, userId) {
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
            throw new common_1.NotFoundException('Company not found');
        }
        const membership = await this.getUserMembership(companyId, userId);
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this company');
        }
        return company;
    }
    async update(companyId, userId, updateCompanyDto) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        await this.checkAdminAccess(companyId, userId);
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
    async addMember(companyId, userId, addMemberDto) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        await this.checkAdminAccess(companyId, userId);
        const userToAdd = await this.prisma.user.findUnique({
            where: { id: addMemberDto.userId },
        });
        if (!userToAdd) {
            throw new common_1.BadRequestException('User to add not found');
        }
        const existingMember = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId: addMemberDto.userId,
                    companyId,
                },
            },
        });
        if (existingMember) {
            throw new common_1.ConflictException('User is already a member of this company');
        }
        const member = await this.prisma.companyMember.create({
            data: {
                userId: addMemberDto.userId,
                companyId,
                role: addMemberDto.role || client_1.MemberRole.BOARD_MEMBER,
                title: addMemberDto.title,
                termStart: addMemberDto.termStart
                    ? new Date(addMemberDto.termStart)
                    : undefined,
                termEnd: addMemberDto.termEnd
                    ? new Date(addMemberDto.termEnd)
                    : undefined,
                status: client_1.MemberStatus.ACTIVE,
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
    async updateMember(companyId, memberId, userId, updateMemberDto) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const currentUserMembership = await this.checkAdminAccess(companyId, userId);
        const memberToUpdate = await this.prisma.companyMember.findUnique({
            where: { id: memberId },
        });
        if (!memberToUpdate || memberToUpdate.companyId !== companyId) {
            throw new common_1.NotFoundException('Member not found');
        }
        if (memberToUpdate.role === client_1.MemberRole.OWNER &&
            currentUserMembership.role !== client_1.MemberRole.OWNER) {
            throw new common_1.ForbiddenException('Only owners can modify other owners');
        }
        if (updateMemberDto.role === client_1.MemberRole.OWNER &&
            currentUserMembership.role !== client_1.MemberRole.OWNER) {
            throw new common_1.ForbiddenException('Only owners can assign owner role');
        }
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
    async removeMember(companyId, memberId, userId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        const currentUserMembership = await this.checkAdminAccess(companyId, userId);
        const memberToRemove = await this.prisma.companyMember.findUnique({
            where: { id: memberId },
        });
        if (!memberToRemove || memberToRemove.companyId !== companyId) {
            throw new common_1.NotFoundException('Member not found');
        }
        if (memberToRemove.role === client_1.MemberRole.OWNER &&
            currentUserMembership.role !== client_1.MemberRole.OWNER) {
            throw new common_1.ForbiddenException('Only owners can remove other owners');
        }
        if (memberToRemove.role === client_1.MemberRole.OWNER) {
            const ownerCount = await this.prisma.companyMember.count({
                where: {
                    companyId,
                    role: client_1.MemberRole.OWNER,
                    status: client_1.MemberStatus.ACTIVE,
                },
            });
            if (ownerCount <= 1) {
                throw new common_1.BadRequestException('Cannot remove the last owner of the company');
            }
        }
        if (memberToRemove.userId === userId) {
            throw new common_1.BadRequestException('You cannot remove yourself from the company');
        }
        await this.prisma.companyMember.delete({
            where: { id: memberId },
        });
        return { message: 'Member removed successfully' };
    }
    async getUserMembership(companyId, userId) {
        return this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
    }
    async checkAdminAccess(companyId, userId) {
        const membership = await this.getUserMembership(companyId, userId);
        if (!membership) {
            throw new common_1.ForbiddenException('You are not a member of this company');
        }
        if (membership.role !== client_1.MemberRole.OWNER &&
            membership.role !== client_1.MemberRole.ADMIN) {
            throw new common_1.ForbiddenException('You must be an owner or admin to perform this action');
        }
        return membership;
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = CompaniesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map