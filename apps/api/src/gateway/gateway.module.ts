import { Module } from '@nestjs/common';
import { MeetingsGateway } from './meetings.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MeetingsGateway],
  exports: [MeetingsGateway],
})
export class GatewayModule {}
