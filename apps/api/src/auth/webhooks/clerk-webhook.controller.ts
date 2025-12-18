import {
  Controller,
  Post,
  Headers,
  Body,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../decorators/public.decorator';
import { InvitationsService } from '../../invitations/invitations.service';

interface ClerkUserData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post()
  @Public()
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
  ) {
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.error('CLERK_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing required Svix headers');
    }

    // Verify the webhook signature
    const wh = new Webhook(webhookSecret);
    let event: ClerkWebhookEvent;

    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        throw new BadRequestException('Missing raw body');
      }

      event = wh.verify(rawBody.toString(), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (error) {
      this.logger.error('Webhook verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle the event
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

  private async handleUserCreated(data: ClerkUserData) {
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

      // After user is created, check for pending invitations
      await this.invitationsService.acceptInvitationByEmail(primaryEmail, data.id);
    } catch (error) {
      // User might already exist (idempotency)
      if (error.code === 'P2002') {
        this.logger.log(`User ${data.id} already exists, updating instead`);
        await this.handleUserUpdated(data);
      } else {
        throw error;
      }
    }
  }

  private async handleUserUpdated(data: ClerkUserData) {
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
    } catch (error) {
      this.logger.error(`Failed to update user ${data.id}`, error);
      throw error;
    }
  }

  private async handleUserDeleted(data: ClerkUserData) {
    try {
      // Soft delete or handle cascading deletes
      // For now, we'll keep the user data for audit purposes
      // but mark any memberships as FORMER
      await this.prisma.companyMember.updateMany({
        where: { userId: data.id },
        data: { status: 'FORMER' },
      });

      this.logger.log(`User marked as former: ${data.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle user deletion ${data.id}`, error);
      throw error;
    }
  }
}
