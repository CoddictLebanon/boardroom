import { Module, forwardRef } from '@nestjs/common';
import { AgendaItemsController } from './agenda-items.controller';
import { AgendaItemsService } from './agenda-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule), PermissionsModule],
  controllers: [AgendaItemsController],
  providers: [AgendaItemsService],
  exports: [AgendaItemsService],
})
export class AgendaItemsModule {}
