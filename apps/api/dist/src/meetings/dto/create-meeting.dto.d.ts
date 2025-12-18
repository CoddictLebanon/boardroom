export declare class CreateMeetingDto {
    title: string;
    description?: string;
    scheduledAt: string;
    duration: number;
    location?: string;
    videoLink?: string;
    attendeeIds?: string[];
    agendaItems?: {
        title: string;
        description?: string;
        duration?: number;
    }[];
}
