import { ActionItemsService } from './action-items.service';
import { CreateActionItemDto, UpdateActionItemDto, UpdateActionItemStatusDto } from './dto';
import { ActionStatus, Priority } from '@prisma/client';
export declare class ActionItemsController {
    private readonly actionItemsService;
    constructor(actionItemsService: ActionItemsService);
    create(companyId: string, createActionItemDto: CreateActionItemDto, userId: string): Promise<{
        company: {
            id: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ActionStatus;
        agendaItemId: string | null;
        meetingId: string | null;
        dueDate: Date | null;
        priority: import("@prisma/client").$Enums.Priority;
        assigneeId: string | null;
    }>;
    findAll(companyId: string, status?: ActionStatus, assigneeId?: string, priority?: Priority, dueDateFrom?: string, dueDateTo?: string, userId?: string): Promise<({
        company: {
            id: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ActionStatus;
        agendaItemId: string | null;
        meetingId: string | null;
        dueDate: Date | null;
        priority: import("@prisma/client").$Enums.Priority;
        assigneeId: string | null;
    })[]>;
    findMyActionItems(userId: string): Promise<({
        company: {
            id: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ActionStatus;
        agendaItemId: string | null;
        meetingId: string | null;
        dueDate: Date | null;
        priority: import("@prisma/client").$Enums.Priority;
        assigneeId: string | null;
    })[]>;
    findOne(id: string, userId: string): Promise<{
        company: {
            id: string;
            name: string;
        };
        agendaItem: {
            id: string;
            title: string;
            meetingId: string;
        } | null;
        assignee: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ActionStatus;
        agendaItemId: string | null;
        meetingId: string | null;
        dueDate: Date | null;
        priority: import("@prisma/client").$Enums.Priority;
        assigneeId: string | null;
    }>;
    update(id: string, updateActionItemDto: UpdateActionItemDto, userId: string): Promise<{
        company: {
            id: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ActionStatus;
        agendaItemId: string | null;
        meetingId: string | null;
        dueDate: Date | null;
        priority: import("@prisma/client").$Enums.Priority;
        assigneeId: string | null;
    }>;
    updateStatus(id: string, updateStatusDto: UpdateActionItemStatusDto, userId: string): Promise<{
        company: {
            id: string;
            name: string;
        };
        assignee: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ActionStatus;
        agendaItemId: string | null;
        meetingId: string | null;
        dueDate: Date | null;
        priority: import("@prisma/client").$Enums.Priority;
        assigneeId: string | null;
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
}
