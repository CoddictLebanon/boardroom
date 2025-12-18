import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateInvitationDto } from './dto';
export declare class InvitationsService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    createInvitation(companyId: string, inviterId: string, dto: CreateInvitationDto): Promise<{
        company: {
            id: string;
            name: string;
        };
        inviter: {
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        role: import("@prisma/client").$Enums.MemberRole;
        companyId: string;
        status: import("@prisma/client").$Enums.InvitationStatus;
        token: string;
        invitedBy: string;
        expiresAt: Date;
    }>;
    listInvitations(companyId: string, userId: string): Promise<({
        inviter: {
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        role: import("@prisma/client").$Enums.MemberRole;
        companyId: string;
        status: import("@prisma/client").$Enums.InvitationStatus;
        token: string;
        invitedBy: string;
        expiresAt: Date;
    })[]>;
    revokeInvitation(invitationId: string, userId: string): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        role: import("@prisma/client").$Enums.MemberRole;
        companyId: string;
        status: import("@prisma/client").$Enums.InvitationStatus;
        token: string;
        invitedBy: string;
        expiresAt: Date;
    }>;
    acceptInvitationByEmail(email: string, userId: string): Promise<{
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
    }[]>;
}
