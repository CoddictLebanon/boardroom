import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto';
export declare class InvitationsController {
    private readonly invitationsService;
    constructor(invitationsService: InvitationsService);
    createInvitation(companyId: string, userId: string, dto: CreateInvitationDto): Promise<{
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
    revokeInvitation(id: string, userId: string): Promise<{
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
}
