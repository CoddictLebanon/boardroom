import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ActionItemsService } from './action-items.service';
import { CreateActionItemDto, UpdateActionItemDto, UpdateActionItemStatusDto } from './dto';
import { ActionStatus, Priority } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';

@Controller()
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Post('companies/:companyId/action-items')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('companyId') companyId: string,
    @Body() createActionItemDto: CreateActionItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.create(companyId, createActionItemDto, userId);
  }

  @Get('companies/:companyId/action-items')
  findAll(
    @Param('companyId') companyId: string,
    @Query('status') status?: ActionStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: Priority,
    @Query('dueDateFrom') dueDateFrom?: string,
    @Query('dueDateTo') dueDateTo?: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.actionItemsService.findAll(companyId, userId!, {
      status,
      assigneeId,
      priority,
      dueDateFrom,
      dueDateTo,
    });
  }

  @Get('action-items/my')
  findMyActionItems(@CurrentUser('userId') userId: string) {
    return this.actionItemsService.findMyActionItems(userId);
  }

  @Get('action-items/:id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.findOne(id, userId);
  }

  @Put('action-items/:id')
  update(
    @Param('id') id: string,
    @Body() updateActionItemDto: UpdateActionItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.update(id, updateActionItemDto, userId);
  }

  @Put('action-items/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateActionItemStatusDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.updateStatus(id, updateStatusDto, userId);
  }

  @Delete('action-items/:id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.remove(id, userId);
  }
}
