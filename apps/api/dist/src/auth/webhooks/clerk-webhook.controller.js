"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClerkWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkWebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const svix_1 = require("svix");
const prisma_service_1 = require("../../prisma/prisma.service");
const public_decorator_1 = require("../decorators/public.decorator");
const invitations_service_1 = require("../../invitations/invitations.service");
let ClerkWebhookController = ClerkWebhookController_1 = class ClerkWebhookController {
    configService;
    prisma;
    invitationsService;
    logger = new common_1.Logger(ClerkWebhookController_1.name);
    constructor(configService, prisma, invitationsService) {
        this.configService = configService;
        this.prisma = prisma;
        this.invitationsService = invitationsService;
    }
    async handleWebhook(svixId, svixTimestamp, svixSignature, req, body) {
        const webhookSecret = this.configService.get('CLERK_WEBHOOK_SECRET');
        if (!webhookSecret) {
            this.logger.error('CLERK_WEBHOOK_SECRET not configured');
            throw new common_1.BadRequestException('Webhook secret not configured');
        }
        if (!svixId || !svixTimestamp || !svixSignature) {
            throw new common_1.BadRequestException('Missing required Svix headers');
        }
        const wh = new svix_1.Webhook(webhookSecret);
        let event;
        try {
            const rawBody = req.rawBody;
            if (!rawBody) {
                throw new common_1.BadRequestException('Missing raw body');
            }
            event = wh.verify(rawBody.toString(), {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            });
        }
        catch (error) {
            this.logger.error('Webhook verification failed', error);
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        this.logger.log(`Received webhook event: ${event.type}`);
        switch (event.type) {
            case 'user.created':
                await this.handleUserCreated(event.data);
                break;
            case 'user.updated':
                await this.handleUserUpdated(event.data);
                break;
            case 'user.deleted':
                await this.handleUserDeleted(event.data);
                break;
            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }
        return { received: true };
    }
    async handleUserCreated(data) {
        const primaryEmail = data.email_addresses[0]?.email_address;
        if (!primaryEmail) {
            this.logger.warn(`User ${data.id} has no email address`);
            return;
        }
        try {
            await this.prisma.user.create({
                data: {
                    id: data.id,
                    email: primaryEmail,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    imageUrl: data.image_url,
                },
            });
            this.logger.log(`User created: ${data.id}`);
            await this.invitationsService.acceptInvitationByEmail(primaryEmail, data.id);
        }
        catch (error) {
            if (error.code === 'P2002') {
                this.logger.log(`User ${data.id} already exists, updating instead`);
                await this.handleUserUpdated(data);
            }
            else {
                throw error;
            }
        }
    }
    async handleUserUpdated(data) {
        const primaryEmail = data.email_addresses[0]?.email_address;
        if (!primaryEmail) {
            this.logger.warn(`User ${data.id} has no email address`);
            return;
        }
        try {
            await this.prisma.user.upsert({
                where: { id: data.id },
                update: {
                    email: primaryEmail,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    imageUrl: data.image_url,
                },
                create: {
                    id: data.id,
                    email: primaryEmail,
                    firstName: data.first_name,
                    lastName: data.last_name,
                    imageUrl: data.image_url,
                },
            });
            this.logger.log(`User updated: ${data.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to update user ${data.id}`, error);
            throw error;
        }
    }
    async handleUserDeleted(data) {
        try {
            await this.prisma.companyMember.updateMany({
                where: { userId: data.id },
                data: { status: 'FORMER' },
            });
            this.logger.log(`User marked as former: ${data.id}`);
        }
        catch (error) {
            this.logger.error(`Failed to handle user deletion ${data.id}`, error);
            throw error;
        }
    }
};
exports.ClerkWebhookController = ClerkWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Headers)('svix-id')),
    __param(1, (0, common_1.Headers)('svix-timestamp')),
    __param(2, (0, common_1.Headers)('svix-signature')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ClerkWebhookController.prototype, "handleWebhook", null);
exports.ClerkWebhookController = ClerkWebhookController = ClerkWebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/clerk'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        invitations_service_1.InvitationsService])
], ClerkWebhookController);
//# sourceMappingURL=clerk-webhook.controller.js.map