import { Module } from '@nestjs/common';
import { MonthlyFinancialsController } from './monthly-financials.controller';
import { MonthlyFinancialsService } from './monthly-financials.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MonthlyFinancialsController],
  providers: [MonthlyFinancialsService],
})
export class MonthlyFinancialsModule {}
