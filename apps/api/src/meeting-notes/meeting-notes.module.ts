import { Module } from '@nestjs/common';
import { MeetingNotesService } from './meeting-notes.service';
import { MeetingNotesController } from './meeting-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [MeetingNotesController],
  providers: [MeetingNotesService],
  exports: [MeetingNotesService],
})
export class MeetingNotesModule {}
