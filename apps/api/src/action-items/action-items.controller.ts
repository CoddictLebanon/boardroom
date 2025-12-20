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
  UseGuards,
} from '@nestjs/common';
import { ActionItemsService } from './action-items.service';
import { CreateActionItemDto, UpdateActionItemDto, UpdateActionItemStatusDto } from './dto';
import { ActionStatus, Priority } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class ActionItemsController {
  constructor(private readonly actionItemsService: ActionItemsService) {}

  @Post('companies/:companyId/action-items')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('action_items.create')
  create(
    @Param('companyId') companyId: string,
    @Body() createActionItemDto: CreateActionItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.create(companyId, createActionItemDto, userId);
  }

  @Get('companies/:companyId/action-items')
  @RequirePermission('action_items.view')
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
  // No permission required - user can view their own action items across companies
  findMyActionItems(@CurrentUser('userId') userId: string) {
    return this.actionItemsService.findMyActionItems(userId);
  }

  @Get('companies/:companyId/action-items/:id')
  @RequirePermission('action_items.view')
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.findOne(id, userId);
  }

  @Put('companies/:companyId/action-items/:id')
  @RequirePermission('action_items.edit')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() updateActionItemDto: UpdateActionItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.update(id, updateActionItemDto, userId);
  }

  @Put('companies/:companyId/action-items/:id/status')
  @RequirePermission('action_items.complete')
  updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateActionItemStatusDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.updateStatus(id, updateStatusDto, userId);
  }

  @Delete('companies/:companyId/action-items/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('action_items.delete')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.actionItemsService.remove(id, userId);
  }
}
