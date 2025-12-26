import { Module } from '@nestjs/common';
import { OkrsService } from './okrs.service';
import { OkrsController } from './okrs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [OkrsController],
  providers: [OkrsService],
  exports: [OkrsService],
})
export class OkrsModule {}
