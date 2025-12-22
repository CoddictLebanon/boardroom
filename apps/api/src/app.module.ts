import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// NOTE: Run `npm install @nestjs/throttler` then uncomment below to enable rate limiting
// import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
// import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { MeetingsModule } from './meetings/meetings.module';
import { AgendaItemsModule } from './agenda-items/agenda-items.module';
import { ActionItemsModule } from './action-items/action-items.module';
import { DocumentsModule } from './documents/documents.module';
import { ResolutionsModule } from './resolutions/resolutions.module';
import { FinancialReportsModule } from './financial-reports/financial-reports.module';
import { GatewayModule } from './gateway/gateway.module';
import { InvitationsModule } from './invitations/invitations.module';
import { EmailModule } from './email/email.module';
import { MonthlyFinancialsModule } from './monthly-financials/monthly-financials.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CustomRolesModule } from './custom-roles/custom-roles.module';
import { MeetingNotesModule } from './meeting-notes/meeting-notes.module';
import { OkrsModule } from './okrs/okrs.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // NOTE: Run `npm install @nestjs/throttler` then uncomment below to enable rate limiting
    // Rate limiting: 100 requests per minute per IP
    // ThrottlerModule.forRoot([
    //   {
    //     ttl: 60000,
    //     limit: 100,
    //   },
    // ]),
    PrismaModule,
    AuthModule,
    PermissionsModule,
    CustomRolesModule,
    CompaniesModule,
    MeetingsModule,
    AgendaItemsModule,
    ActionItemsModule,
    DocumentsModule,
    ResolutionsModule,
    FinancialReportsModule,
    GatewayModule,
    InvitationsModule,
    EmailModule,
    MonthlyFinancialsModule,
    MeetingNotesModule,
    OkrsModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // NOTE: Uncomment after installing @nestjs/throttler
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
