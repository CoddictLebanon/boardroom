declare enum MeetingStatus {
    SCHEDULED = "SCHEDULED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class UpdateMeetingDto {
    title?: string;
    description?: string;
    scheduledAt?: string;
    duration?: number;
    location?: string;
    videoLink?: string;
    status?: MeetingStatus;
}
export {};
