import { Injectable, NotFoundException, ForbiddenException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsGateway } from '../gateway/meetings.gateway';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateActionItemDto, UpdateActionItemDto, UpdateActionItemStatusDto } from './dto';
import { ActionStatus, Priority, Prisma } from '@prisma/client';

@Injectable()
export class ActionItemsService {
  private readonly logger = new Logger(ActionItemsService.name);

  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
    @Optional() private meetingsGateway?: MeetingsGateway,
  ) {}

  async create(companyId: string, dto: CreateActionItemDto, userId: string) {
    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, companyId);

    // Verify assignee is a member of the company (only if provided)
    if (dto.assigneeId) {
      await this.verifyCompanyMember(dto.assigneeId, companyId);
    }

    // Get max order for this meeting's action items (if meeting-scoped)
    let nextOrder = 0;
    if (dto.meetingId) {
      const maxOrderItem = await this.prisma.actionItem.findFirst({
        where: { meetingId: dto.meetingId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      nextOrder = (maxOrderItem?.order ?? -1) + 1;
    }

    const actionItem = await this.prisma.actionItem.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        createdById: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority || Priority.MEDIUM,
        status: dto.status || ActionStatus.PENDING,
        meetingId: dto.meetingId,
        agendaItemId: dto.agendaItemId,
        order: nextOrder,
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
        createdBy: {
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

    // Emit socket event if associated with a meeting
    if (actionItem.meetingId) {
      try {
        this.meetingsGateway?.emitToMeeting(actionItem.meetingId, 'actionItem:created', actionItem);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to emit actionItem:created event: ${errorMessage}`);
      }
    }

    return actionItem;
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
    const membership = await this.verifyCompanyAccess(userId, companyId);

    // Check if user has permission to view all action items
    const canViewAll = await this.permissionsService.hasPermission(
      userId,
      companyId,
      'action_items.view_all',
    );

    const where: Prisma.ActionItemWhereInput = {
      companyId,
    };

    // If no view_all permission, filter to only relevant action items
    if (!canViewAll) {
      // Get meetings where user is an attendee
      const attendedMeetings = await this.prisma.meetingAttendee.findMany({
        where: { memberId: membership.id },
        select: { meetingId: true },
      });
      const attendedMeetingIds = attendedMeetings.map((m) => m.meetingId);

      where.OR = [
        { assigneeId: userId }, // Assigned to them
        { createdById: userId }, // Created by them
        { meetingId: { in: attendedMeetingIds } }, // From meetings they attend
      ];
    }

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
        createdBy: {
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
        createdBy: {
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
        createdBy: {
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
    const membership = await this.verifyCompanyAccess(userId, actionItem.companyId);

    // Check if user has permission to view all action items
    const canViewAll = await this.permissionsService.hasPermission(
      userId,
      actionItem.companyId,
      'action_items.view_all',
    );

    // If no view_all permission, check if user is involved
    if (!canViewAll) {
      const isAssignee = actionItem.assigneeId === userId;
      const isCreator = actionItem.createdById === userId;

      // Check if user is attendee of the associated meeting
      let isAttendee = false;
      if (actionItem.meetingId) {
        const attendance = await this.prisma.meetingAttendee.findFirst({
          where: {
            meetingId: actionItem.meetingId,
            memberId: membership.id,
          },
        });
        isAttendee = !!attendance;
      }

      if (!isAssignee && !isCreator && !isAttendee) {
        throw new ForbiddenException('Access denied: You are not involved in this action item');
      }
    }

    // Auto-update if overdue
    const updated = await this.checkAndUpdateOverdue(actionItem);
    return updated || actionItem;
  }

  async update(id: string, dto: UpdateActionItemDto, userId: string) {
    const existing = await this.prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Action item not found');
    }

    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, existing.companyId);

    // If updating assignee, verify new assignee is a member of the company
    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.verifyCompanyMember(dto.assigneeId, existing.companyId);
    }

    const actionItem = await this.prisma.actionItem.update({
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
        createdBy: {
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

    // Emit socket event if associated with a meeting
    if (actionItem.meetingId) {
      try {
        this.meetingsGateway?.emitToMeeting(actionItem.meetingId, 'actionItem:updated', actionItem);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to emit actionItem:updated event: ${errorMessage}`);
      }
    }

    return actionItem;
  }

  async updateStatus(id: string, dto: UpdateActionItemStatusDto, userId: string) {
    const existing = await this.prisma.actionItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Action item not found');
    }

    // Verify user has access to the company
    await this.verifyCompanyAccess(userId, existing.companyId);

    const actionItem = await this.prisma.actionItem.update({
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
        createdBy: {
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

    // Emit socket event if associated with a meeting
    if (actionItem.meetingId) {
      try {
        this.meetingsGateway?.emitToMeeting(actionItem.meetingId, 'actionItem:updated', actionItem);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to emit actionItem:updated event: ${errorMessage}`);
      }
    }

    return actionItem;
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

    const meetingId = actionItem.meetingId;

    await this.prisma.actionItem.delete({
      where: { id },
    });

    // Emit socket event if associated with a meeting
    if (meetingId) {
      try {
        this.meetingsGateway?.emitToMeeting(meetingId, 'actionItem:deleted', { id });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to emit actionItem:deleted event: ${errorMessage}`);
      }
    }

    return { message: 'Action item deleted successfully' };
  }

  async reorder(meetingId: string, itemIds: string[], userId: string) {
    // Get first item to verify company access
    if (itemIds.length === 0) return [];

    const firstItem = await this.prisma.actionItem.findUnique({
      where: { id: itemIds[0] },
    });

    if (!firstItem) {
      throw new NotFoundException('Action item not found');
    }

    await this.verifyCompanyAccess(userId, firstItem.companyId);

    const updates = itemIds.map((itemId, index) =>
      this.prisma.actionItem.update({
        where: { id: itemId },
        data: { order: index },
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
          createdBy: {
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
      }),
    );

    const items = await this.prisma.$transaction(updates);

    // Emit socket event
    try {
      this.meetingsGateway?.emitToMeeting(meetingId, 'actionItem:reordered', { itemIds });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit actionItem:reordered event: ${errorMessage}`);
    }

    return items;
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
