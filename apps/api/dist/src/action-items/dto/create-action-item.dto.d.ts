import { Priority, ActionStatus } from '@prisma/client';
export declare class CreateActionItemDto {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: Priority;
    status?: ActionStatus;
    meetingId?: string;
    agendaItemId?: string;
}
