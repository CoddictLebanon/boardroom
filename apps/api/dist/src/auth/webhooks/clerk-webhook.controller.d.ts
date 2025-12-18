import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InvitationsService } from '../../invitations/invitations.service';
export declare class ClerkWebhookController {
    private readonly configService;
    private readonly prisma;
    private readonly invitationsService;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, invitationsService: InvitationsService);
    handleWebhook(svixId: string, svixTimestamp: string, svixSignature: string, req: RawBodyRequest<Request>, body: any): Promise<{
        received: boolean;
    }>;
    private handleUserCreated;
    private handleUserUpdated;
    private handleUserDeleted;
}
