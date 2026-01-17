import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ValidationPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { OkrsService } from './okrs.service';
import {
  CreateOkrPeriodDto,
  UpdateOkrPeriodDto,
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateKeyResultDto,
  UpdateKeyResultDto,
} from './dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class OkrsController {
  constructor(private readonly okrsService: OkrsService) {}

  // ==========================================
  // OKR Periods
  // ==========================================

  @Post('companies/:companyId/okr-periods')
  @RequirePermission('okrs.create')
  createPeriod(
    @Param('companyId') companyId: string,
    @Body() dto: CreateOkrPeriodDto,
  ) {
    return this.okrsService.createPeriod(companyId, dto);
  }

  @Get('companies/:companyId/okr-periods')
  @RequirePermission('okrs.view')
  findAllPeriods(@Param('companyId') companyId: string) {
    return this.okrsService.findAllPeriods(companyId);
  }

  @Get('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.view')
  findOnePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.findOnePeriod(id, companyId);
  }

  @Patch('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.edit')
  updatePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOkrPeriodDto,
  ) {
    return this.okrsService.updatePeriod(id, companyId, dto);
  }

  @Post('companies/:companyId/okr-periods/:id/close')
  @RequirePermission('okrs.close')
  closePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.closePeriod(id, companyId);
  }

  @Post('companies/:companyId/okr-periods/:id/reopen')
  @RequirePermission('okrs.close')
  reopenPeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.reopenPeriod(id, companyId);
  }

  @Delete('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.delete')
  deletePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.deletePeriod(id, companyId);
  }

  // ==========================================
  // Objectives
  // ==========================================

  @Post('companies/:companyId/okr-periods/:periodId/objectives')
  @RequirePermission('okrs.create')
  createObjective(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Body() dto: CreateObjectiveDto,
  ) {
    return this.okrsService.createObjective(periodId, companyId, dto);
  }

  @Patch('companies/:companyId/okr-periods/:periodId/objectives/:id')
  @RequirePermission('okrs.edit')
  updateObjective(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveDto,
  ) {
    return this.okrsService.updateObjective(id, companyId, dto);
  }

  @Delete('companies/:companyId/okr-periods/:periodId/objectives/:id')
  @RequirePermission('okrs.delete')
  deleteObjective(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.deleteObjective(id, companyId);
  }

  // ==========================================
  // Key Results
  // ==========================================

  @Post('companies/:companyId/okr-periods/:periodId/objectives/:objectiveId/key-results')
  @RequirePermission('okrs.create')
  createKeyResult(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Param('objectiveId') objectiveId: string,
    @Body() dto: CreateKeyResultDto,
  ) {
    return this.okrsService.createKeyResult(objectiveId, companyId, dto);
  }

  @Patch('companies/:companyId/okr-periods/:periodId/objectives/:objectiveId/key-results/:id')
  @RequirePermission('okrs.edit')
  updateKeyResult(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Param('objectiveId') objectiveId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKeyResultDto,
  ) {
    return this.okrsService.updateKeyResult(id, companyId, dto);
  }

  @Delete('companies/:companyId/okr-periods/:periodId/objectives/:objectiveId/key-results/:id')
  @RequirePermission('okrs.delete')
  deleteKeyResult(
    @Param('companyId') companyId: string,
    @Param('periodId') periodId: string,
    @Param('objectiveId') objectiveId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.deleteKeyResult(id, companyId);
  }
}
