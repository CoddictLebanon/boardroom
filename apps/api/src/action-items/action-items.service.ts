import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActionItemDto, UpdateActionItemDto, UpdateActionItemStatusDto } from './dto';
import { ActionStatus, Priority, Prisma } from '@prisma/client';

@Injectable()
export class ActionItemsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, dto: CreateActionItemDto, userId: string) {
    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, companyId);

    // Verify assignee is a member of the company (only if provided)
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
        priority: dto.priority || Priority.MEDIUM,
        status: dto.status || ActionStatus.PENDING,
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

  async findAll(
    companyId: string,
    userId: string,
    filters?: {
      status?: ActionStatus;
      assigneeId?: string;
      priority?: Priority;
      dueDateFrom?: string;
      dueDateTo?: string;
    },
  ) {
    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, companyId);

    const where: Prisma.ActionItemWhereInput = {
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
        { priority: 'asc' }, // HIGH first
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Auto-update overdue items
    await this.updateOverdueItems(actionItems);

    return actionItems;
  }

  async findMyActionItems(userId: string) {
    const actionItems = await this.prisma.actionItem.findMany({
      where: {
        assigneeId: userId,
        status: {
          not: ActionStatus.COMPLETED,
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

    // Auto-update overdue items
    await this.updateOverdueItems(actionItems);

    return actionItems;
  }

  async findOne(id: string, userId: string) {
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
      throw new NotFoundException('Action item not found');
    }

    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, actionItem.companyId);

    // Auto-update if overdue
    const updated = await this.checkAndUpdateOverdue(actionItem);
    return updated || actionItem;
  }

  async update(id: string, dto: UpdateActionItemDto, userId: string) {
    const actionItem = await this.prisma.actionItem.findUnique({
      where: { id },
    });

    if (!actionItem) {
      throw new NotFoundException('Action item not found');
    }

    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, actionItem.companyId);

    // If updating assignee, verify new assignee is a member of the company
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

  async updateStatus(id: string, dto: UpdateActionItemStatusDto, userId: string) {
    const actionItem = await this.prisma.actionItem.findUnique({
      where: { id },
    });

    if (!actionItem) {
      throw new NotFoundException('Action item not found');
    }

    // Verify user has access to the company
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

  async remove(id: string, userId: string) {
    const actionItem = await this.prisma.actionItem.findUnique({
      where: { id },
    });

    if (!actionItem) {
      throw new NotFoundException('Action item not found');
    }

    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, actionItem.companyId);

    await this.prisma.actionItem.delete({
      where: { id },
    });

    return { message: 'Action item deleted successfully' };
  }

  // Helper method to auto-mark items as overdue
  private async checkAndUpdateOverdue(actionItem: any) {
    if (
      actionItem.dueDate &&
      actionItem.status !== ActionStatus.COMPLETED &&
      actionItem.status !== ActionStatus.OVERDUE &&
      new Date(actionItem.dueDate) < new Date()
    ) {
      return this.prisma.actionItem.update({
        where: { id: actionItem.id },
        data: { status: ActionStatus.OVERDUE },
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

  private async updateOverdueItems(actionItems: any[]) {
    const now = new Date();
    const overdueIds = actionItems
      .filter(
        (item) =>
          item.dueDate &&
          item.status !== ActionStatus.COMPLETED &&
          item.status !== ActionStatus.OVERDUE &&
          new Date(item.dueDate) < now,
      )
      .map((item) => item.id);

    if (overdueIds.length > 0) {
      await this.prisma.actionItem.updateMany({
        where: {
          id: { in: overdueIds },
        },
        data: {
          status: ActionStatus.OVERDUE,
        },
      });

      // Update the items in the array
      actionItems.forEach((item) => {
        if (overdueIds.includes(item.id)) {
          item.status = ActionStatus.OVERDUE;
        }
      });
    }
  }

  private async verifyCompanyAccess(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return membership;
  }

  private async verifyCompanyMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Assignee is not a member of this company');
    }

    return membership;
  }
}
