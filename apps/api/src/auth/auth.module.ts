import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkWebhookController } from './webhooks/clerk-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationsModule } from '../invitations/invitations.module';

@Global()
@Module({
  imports: [PrismaModule, InvitationsModule],
  controllers: [ClerkWebhookController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
  exports: [],
})
export class AuthModule {}
