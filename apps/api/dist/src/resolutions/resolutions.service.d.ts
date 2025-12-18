import { PrismaService } from '../prisma/prisma.service';
import { CreateResolutionDto, UpdateResolutionDto } from './dto';
import { ResolutionStatus, ResolutionCategory } from '@prisma/client';
export declare class ResolutionsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, createDto: CreateResolutionDto): Promise<{
        company: {
            id: string;
            name: string;
        };
        decision: ({
            meeting: {
                id: string;
                title: string;
                scheduledAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            agendaItemId: string | null;
            outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
            meetingId: string;
        }) | null;
    } & {
        number: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ResolutionStatus;
        decisionId: string | null;
        content: string;
        category: import("@prisma/client").$Enums.ResolutionCategory;
        effectiveDate: Date | null;
    }>;
    findAll(companyId: string, filters?: {
        status?: ResolutionStatus;
        category?: ResolutionCategory;
        year?: number;
    }): Promise<({
        company: {
            id: string;
            name: string;
        };
        decision: ({
            meeting: {
                id: string;
                title: string;
                scheduledAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            agendaItemId: string | null;
            outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
            meetingId: string;
        }) | null;
    } & {
        number: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ResolutionStatus;
        decisionId: string | null;
        content: string;
        category: import("@prisma/client").$Enums.ResolutionCategory;
        effectiveDate: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        company: {
            id: string;
            name: string;
        };
        decision: ({
            meeting: {
                id: string;
                title: string;
                scheduledAt: Date;
            };
            votes: ({
                user: {
                    id: string;
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
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
        }) | null;
    } & {
        number: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ResolutionStatus;
        decisionId: string | null;
        content: string;
        category: import("@prisma/client").$Enums.ResolutionCategory;
        effectiveDate: Date | null;
    }>;
    update(id: string, updateDto: UpdateResolutionDto): Promise<{
        company: {
            id: string;
            name: string;
        };
        decision: ({
            meeting: {
                id: string;
                title: string;
                scheduledAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            agendaItemId: string | null;
            outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
            meetingId: string;
        }) | null;
    } & {
        number: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ResolutionStatus;
        decisionId: string | null;
        content: string;
        category: import("@prisma/client").$Enums.ResolutionCategory;
        effectiveDate: Date | null;
    }>;
    updateStatus(id: string, status: ResolutionStatus): Promise<{
        company: {
            id: string;
            name: string;
        };
        decision: ({
            meeting: {
                id: string;
                title: string;
                scheduledAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            agendaItemId: string | null;
            outcome: import("@prisma/client").$Enums.DecisionOutcome | null;
            meetingId: string;
        }) | null;
    } & {
        number: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        companyId: string;
        status: import("@prisma/client").$Enums.ResolutionStatus;
        decisionId: string | null;
        content: string;
        category: import("@prisma/client").$Enums.ResolutionCategory;
        effectiveDate: Date | null;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    getNextResolutionNumber(companyId: string): Promise<string>;
    private generateResolutionNumber;
}
