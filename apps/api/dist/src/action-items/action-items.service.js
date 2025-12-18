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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionItemsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ActionItemsService = class ActionItemsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto, userId) {
        await this.verifyCompanyAccess(userId, companyId);
        if (dto.assigneeId) {
            await this.verifyCompanyMember(dto.assigneeId, companyId);
        }
        return this.prisma.actionItem.create({
            data: {
                companyId,
                title: dto.title,
                description: dto.description,
                assigneeId: dto.assigneeId,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                priority: dto.priority || client_1.Priority.MEDIUM,
                status: dto.status || client_1.ActionStatus.PENDING,
                meetingId: dto.meetingId,
                agendaItemId: dto.agendaItemId,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async findAll(companyId, userId, filters) {
        await this.verifyCompanyAccess(userId, companyId);
        const where = {
            companyId,
        };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.assigneeId) {
            where.assigneeId = filters.assigneeId;
        }
        if (filters?.priority) {
            where.priority = filters.priority;
        }
        if (filters?.dueDateFrom || filters?.dueDateTo) {
            where.dueDate = {};
            if (filters.dueDateFrom) {
                where.dueDate.gte = new Date(filters.dueDateFrom);
            }
            if (filters.dueDateTo) {
                where.dueDate.lte = new Date(filters.dueDateTo);
            }
        }
        const actionItems = await this.prisma.actionItem.findMany({
            where,
            include: {
                assignee: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { priority: 'asc' },
                { dueDate: 'asc' },
                { createdAt: 'desc' },
            ],
        });
        await this.updateOverdueItems(actionItems);
        return actionItems;
    }
    async findMyActionItems(userId) {
        const actionItems = await this.prisma.actionItem.findMany({
            where: {
                assigneeId: userId,
                status: {
                    not: client_1.ActionStatus.COMPLETED,
                },
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { priority: 'asc' },
                { dueDate: 'asc' },
                { createdAt: 'desc' },
            ],
        });
        await this.updateOverdueItems(actionItems);
        return actionItems;
    }
    async findOne(id, userId) {
        const actionItem = await this.prisma.actionItem.findUnique({
            where: { id },
            include: {
                assignee: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                agendaItem: {
                    select: {
                        id: true,
                        title: true,
                        meetingId: true,
                    },
                },
            },
        });
        if (!actionItem) {
            throw new common_1.NotFoundException('Action item not found');
        }
        await this.verifyCompanyAccess(userId, actionItem.companyId);
        const updated = await this.checkAndUpdateOverdue(actionItem);
        return updated || actionItem;
    }
    async update(id, dto, userId) {
        const actionItem = await this.prisma.actionItem.findUnique({
            where: { id },
        });
        if (!actionItem) {
            throw new common_1.NotFoundException('Action item not found');
        }
        await this.verifyCompanyAccess(userId, actionItem.companyId);
        if (dto.assigneeId && dto.assigneeId !== actionItem.assigneeId) {
            await this.verifyCompanyMember(dto.assigneeId, actionItem.companyId);
        }
        return this.prisma.actionItem.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                assigneeId: dto.assigneeId,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
                priority: dto.priority,
                status: dto.status,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async updateStatus(id, dto, userId) {
        const actionItem = await this.prisma.actionItem.findUnique({
            where: { id },
        });
        if (!actionItem) {
            throw new common_1.NotFoundException('Action item not found');
        }
        await this.verifyCompanyAccess(userId, actionItem.companyId);
        return this.prisma.actionItem.update({
            where: { id },
            data: {
                status: dto.status,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        imageUrl: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async remove(id, userId) {
        const actionItem = await this.prisma.actionItem.findUnique({
            where: { id },
        });
        if (!actionItem) {
            throw new common_1.NotFoundException('Action item not found');
        }
        await this.verifyCompanyAccess(userId, actionItem.companyId);
        await this.prisma.actionItem.delete({
            where: { id },
        });
        return { message: 'Action item deleted successfully' };
    }
    async checkAndUpdateOverdue(actionItem) {
        if (actionItem.dueDate &&
            actionItem.status !== client_1.ActionStatus.COMPLETED &&
            actionItem.status !== client_1.ActionStatus.OVERDUE &&
            new Date(actionItem.dueDate) < new Date()) {
            return this.prisma.actionItem.update({
                where: { id: actionItem.id },
                data: { status: client_1.ActionStatus.OVERDUE },
                include: {
                    assignee: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            imageUrl: true,
                        },
                    },
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    agendaItem: {
                        select: {
                            id: true,
                            title: true,
                            meetingId: true,
                        },
                    },
                },
            });
        }
        return null;
    }
    async updateOverdueItems(actionItems) {
        const now = new Date();
        const overdueIds = actionItems
            .filter((item) => item.dueDate &&
            item.status !== client_1.ActionStatus.COMPLETED &&
            item.status !== client_1.ActionStatus.OVERDUE &&
            new Date(item.dueDate) < now)
            .map((item) => item.id);
        if (overdueIds.length > 0) {
            await this.prisma.actionItem.updateMany({
                where: {
                    id: { in: overdueIds },
                },
                data: {
                    status: client_1.ActionStatus.OVERDUE,
                },
            });
            actionItems.forEach((item) => {
                if (overdueIds.includes(item.id)) {
                    item.status = client_1.ActionStatus.OVERDUE;
                }
            });
        }
    }
    async verifyCompanyAccess(userId, companyId) {
        const membership = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this company');
        }
        return membership;
    }
    async verifyCompanyMember(userId, companyId) {
        const membership = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('Assignee is not a member of this company');
        }
        return membership;
    }
};
exports.ActionItemsService = ActionItemsService;
exports.ActionItemsService = ActionItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActionItemsService);
//# sourceMappingURL=action-items.service.js.map