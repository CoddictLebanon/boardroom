import { Module, forwardRef } from '@nestjs/common';
import { AgendaItemsController } from './agenda-items.controller';
import { AgendaItemsService } from './agenda-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule)],
  controllers: [AgendaItemsController],
  providers: [AgendaItemsService],
  exports: [AgendaItemsService],
})
export class AgendaItemsModule {}
