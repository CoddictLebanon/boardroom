import { Priority, ActionStatus } from '@prisma/client';
export declare class UpdateActionItemDto {
    title?: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: Priority;
    status?: ActionStatus;
}
export declare class UpdateActionItemStatusDto {
    status: ActionStatus;
}
