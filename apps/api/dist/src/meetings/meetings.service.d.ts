import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto, UpdateMeetingDto, CreateAgendaItemDto, UpdateAgendaItemDto, CreateDecisionDto, CastVoteDto, AddAttendeesDto, MarkAttendanceDto } from './dto';
import { MeetingStatus } from '@prisma/client';
export declare class MeetingsService {
    private prisma;
    constructor(prisma: PrismaService);
    createMeeting(companyId: string, userId: string, dto: CreateMeetingDto): Promise<{
        agendaItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            duration: number | null;
            notes: string | null;
            order: number;
            meetingId: string;
        }[];
        attendees: ({
            member: {
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string | null;
                role: import("@prisma/client").$Enums.MemberRole;
                userId: string;
                companyId: string;
                termStart: Date | null;
                termEnd: Date | null;
                status: import("@prisma/client").$Enums.MemberStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            isPresent: boolean | null;
            meetingId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.MeetingStatus;
        scheduledAt: Date;
        duration: number;
        location: string | null;
        videoLink: string | null;
    }>;
    getMeetings(companyId: string, userId: string, filters?: {
        status?: MeetingStatus;
        upcoming?: boolean;
        past?: boolean;
    }): Promise<({
        _count: {
            decisions: number;
        };
        agendaItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            duration: number | null;
            notes: string | null;
            order: number;
            meetingId: string;
        }[];
        attendees: ({
            member: {
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string | null;
                role: import("@prisma/client").$Enums.MemberRole;
                userId: string;
                companyId: string;
                termStart: Date | null;
                termEnd: Date | null;
                status: import("@prisma/client").$Enums.MemberStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            isPresent: boolean | null;
            meetingId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.MeetingStatus;
        scheduledAt: Date;
        duration: number;
        location: string | null;
        videoLink: string | null;
    })[]>;
    getMeeting(id: string, userId: string): Promise<{
        company: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            logo: string | null;
            timezone: string;
            fiscalYearStart: number;
        };
        documents: ({
            document: {
                uploader: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                type: import("@prisma/client").$Enums.DocumentType;
                companyId: string;
                folderId: string | null;
                uploaderId: string;
                mimeType: string | null;
                size: number | null;
                storageKey: string;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            meetingId: string;
            documentId: string;
            isPreRead: boolean;
        })[];
        summary: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            meetingId: string;
            content: string;
            sentAt: Date | null;
        } | null;
        agendaItems: ({
            decisions: ({
                votes: ({
                    user: {
                        id: string;
                        email: string;
                        firstName: string | null;
                        lastName: string | null;
                        imageUrl: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                    };
                } & {
                    vote: import("@prisma/client").$Enums.VoteType;
                    id: string;
                    createdAt: Date;
                    userId: string;
                    decisionId: string;
                })[];
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                title: string;
                agendaItemId: string | null;
                outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
                meetingId: string;
            })[];
            actions: ({
                assignee: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
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
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            duration: number | null;
            notes: string | null;
            order: number;
            meetingId: string;
        })[];
        attendees: ({
            member: {
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string | null;
                role: import("@prisma/client").$Enums.MemberRole;
                userId: string;
                companyId: string;
                termStart: Date | null;
                termEnd: Date | null;
                status: import("@prisma/client").$Enums.MemberStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            isPresent: boolean | null;
            meetingId: string;
        })[];
        decisions: ({
            agendaItem: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                title: string;
                duration: number | null;
                notes: string | null;
                order: number;
                meetingId: string;
            } | null;
            votes: ({
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                vote: import("@prisma/client").$Enums.VoteType;
                id: string;
                createdAt: Date;
                userId: string;
                decisionId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            agendaItemId: string | null;
            outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
            meetingId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.MeetingStatus;
        scheduledAt: Date;
        duration: number;
        location: string | null;
        videoLink: string | null;
    }>;
    updateMeeting(id: string, userId: string, dto: UpdateMeetingDto): Promise<{
        agendaItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            duration: number | null;
            notes: string | null;
            order: number;
            meetingId: string;
        }[];
        attendees: ({
            member: {
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string | null;
                role: import("@prisma/client").$Enums.MemberRole;
                userId: string;
                companyId: string;
                termStart: Date | null;
                termEnd: Date | null;
                status: import("@prisma/client").$Enums.MemberStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            isPresent: boolean | null;
            meetingId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.MeetingStatus;
        scheduledAt: Date;
        duration: number;
        location: string | null;
        videoLink: string | null;
    }>;
    cancelMeeting(id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.MeetingStatus;
        scheduledAt: Date;
        duration: number;
        location: string | null;
        videoLink: string | null;
    }>;
    addAgendaItem(meetingId: string, userId: string, dto: CreateAgendaItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        duration: number | null;
        notes: string | null;
        order: number;
        meetingId: string;
    }>;
    updateAgendaItem(meetingId: string, itemId: string, userId: string, dto: UpdateAgendaItemDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        duration: number | null;
        notes: string | null;
        order: number;
        meetingId: string;
    }>;
    addAttendees(meetingId: string, userId: string, dto: AddAttendeesDto): Promise<({
        member: {
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            role: import("@prisma/client").$Enums.MemberRole;
            userId: string;
            companyId: string;
            termStart: Date | null;
            termEnd: Date | null;
            status: import("@prisma/client").$Enums.MemberStatus;
        };
    } & {
        id: string;
        createdAt: Date;
        memberId: string;
        isPresent: boolean | null;
        meetingId: string;
    })[]>;
    markAttendance(meetingId: string, attendeeId: string, userId: string, dto: MarkAttendanceDto): Promise<{
        member: {
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            role: import("@prisma/client").$Enums.MemberRole;
            userId: string;
            companyId: string;
            termStart: Date | null;
            termEnd: Date | null;
            status: import("@prisma/client").$Enums.MemberStatus;
        };
    } & {
        id: string;
        createdAt: Date;
        memberId: string;
        isPresent: boolean | null;
        meetingId: string;
    }>;
    createDecision(meetingId: string, userId: string, dto: CreateDecisionDto): Promise<{
        agendaItem: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            duration: number | null;
            notes: string | null;
            order: number;
            meetingId: string;
        } | null;
        votes: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            vote: import("@prisma/client").$Enums.VoteType;
            id: string;
            createdAt: Date;
            userId: string;
            decisionId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        agendaItemId: string | null;
        outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
        meetingId: string;
    }>;
    castVote(meetingId: string, decisionId: string, userId: string, dto: CastVoteDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        vote: import("@prisma/client").$Enums.VoteType;
        id: string;
        createdAt: Date;
        userId: string;
        decisionId: string;
    }>;
    completeMeeting(meetingId: string, userId: string): Promise<{
        summary: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            meetingId: string;
            content: string;
            sentAt: Date | null;
        } | null;
        agendaItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            duration: number | null;
            notes: string | null;
            order: number;
            meetingId: string;
        }[];
        attendees: ({
            member: {
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string | null;
                role: import("@prisma/client").$Enums.MemberRole;
                userId: string;
                companyId: string;
                termStart: Date | null;
                termEnd: Date | null;
                status: import("@prisma/client").$Enums.MemberStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            memberId: string;
            isPresent: boolean | null;
            meetingId: string;
        })[];
        decisions: ({
            votes: ({
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                    imageUrl: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
            } & {
                vote: import("@prisma/client").$Enums.VoteType;
                id: string;
                createdAt: Date;
                userId: string;
                decisionId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            agendaItemId: string | null;
            outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
            meetingId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.MeetingStatus;
        scheduledAt: Date;
        duration: number;
        location: string | null;
        videoLink: string | null;
    }>;
    private generateMeetingSummary;
    private verifyCompanyMember;
}
