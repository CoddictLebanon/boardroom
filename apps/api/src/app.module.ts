import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { MeetingsModule } from './meetings/meetings.module';
import { ActionItemsModule } from './action-items/action-items.module';
import { DocumentsModule } from './documents/documents.module';
import { ResolutionsModule } from './resolutions/resolutions.module';
import { FinancialReportsModule } from './financial-reports/financial-reports.module';
import { GatewayModule } from './gateway/gateway.module';
import { InvitationsModule } from './invitations/invitations.module';
import { EmailModule } from './email/email.module';
import { MonthlyFinancialsModule } from './monthly-financials/monthly-financials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    MeetingsModule,
    ActionItemsModule,
    DocumentsModule,
    ResolutionsModule,
    FinancialReportsModule,
    GatewayModule,
    InvitationsModule,
    EmailModule,
    MonthlyFinancialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
