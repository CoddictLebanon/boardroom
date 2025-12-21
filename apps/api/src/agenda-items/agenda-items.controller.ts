import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AgendaItemsService } from './agenda-items.service';
import { CreateAgendaItemDto, UpdateAgendaItemDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller('companies/:companyId/meetings/:meetingId/agenda')
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class AgendaItemsController {
  constructor(private readonly agendaItemsService: AgendaItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('meetings.edit')
  create(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.create(companyId, meetingId, dto, userId);
  }

  @Get()
  @RequirePermission('meetings.view')
  findAll(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.findAllForMeeting(companyId, meetingId, userId);
  }

  @Put('reorder')
  @RequirePermission('meetings.edit')
  reorder(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: { itemIds: string[] },
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.reorder(companyId, meetingId, body.itemIds, userId);
  }

  @Put(':itemId')
  @RequirePermission('meetings.edit')
  update(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.update(companyId, meetingId, itemId, dto, userId);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('meetings.edit')
  remove(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.remove(companyId, meetingId, itemId, userId);
  }
}
