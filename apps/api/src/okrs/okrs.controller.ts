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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('okrs')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Create a new OKR period' })
  createPeriod(
    @Param('companyId') companyId: string,
    @Body() dto: CreateOkrPeriodDto,
  ) {
    return this.okrsService.createPeriod(companyId, dto);
  }

  @Get('companies/:companyId/okr-periods')
  @RequirePermission('okrs.view')
  @ApiOperation({ summary: 'Get all OKR periods for a company' })
  findAllPeriods(@Param('companyId') companyId: string) {
    return this.okrsService.findAllPeriods(companyId);
  }

  @Get('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.view')
  @ApiOperation({ summary: 'Get a specific OKR period' })
  findOnePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.findOnePeriod(id);
  }

  @Patch('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.edit')
  @ApiOperation({ summary: 'Update an OKR period' })
  updatePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOkrPeriodDto,
  ) {
    return this.okrsService.updatePeriod(id, dto);
  }

  @Post('companies/:companyId/okr-periods/:id/close')
  @RequirePermission('okrs.close')
  @ApiOperation({ summary: 'Close an OKR period' })
  closePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.closePeriod(id);
  }

  @Post('companies/:companyId/okr-periods/:id/reopen')
  @RequirePermission('okrs.close')
  @ApiOperation({ summary: 'Reopen a closed OKR period' })
  reopenPeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.reopenPeriod(id);
  }

  @Delete('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.delete')
  @ApiOperation({ summary: 'Delete an OKR period' })
  deletePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.deletePeriod(id);
  }

  // ==========================================
  // Objectives
  // ==========================================

  @Post('okr-periods/:periodId/objectives')
  @RequirePermission('okrs.create')
  @ApiOperation({ summary: 'Create a new objective' })
  createObjective(
    @Param('periodId') periodId: string,
    @Body() dto: CreateObjectiveDto,
  ) {
    return this.okrsService.createObjective(periodId, dto);
  }

  @Patch('objectives/:id')
  @RequirePermission('okrs.edit')
  @ApiOperation({ summary: 'Update an objective' })
  updateObjective(
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveDto,
  ) {
    return this.okrsService.updateObjective(id, dto);
  }

  @Delete('objectives/:id')
  @RequirePermission('okrs.delete')
  @ApiOperation({ summary: 'Delete an objective' })
  deleteObjective(@Param('id') id: string) {
    return this.okrsService.deleteObjective(id);
  }

  // ==========================================
  // Key Results
  // ==========================================

  @Post('objectives/:objectiveId/key-results')
  @RequirePermission('okrs.create')
  @ApiOperation({ summary: 'Create a new key result' })
  createKeyResult(
    @Param('objectiveId') objectiveId: string,
    @Body() dto: CreateKeyResultDto,
  ) {
    return this.okrsService.createKeyResult(objectiveId, dto);
  }

  @Patch('key-results/:id')
  @RequirePermission('okrs.edit')
  @ApiOperation({ summary: 'Update a key result' })
  updateKeyResult(
    @Param('id') id: string,
    @Body() dto: UpdateKeyResultDto,
  ) {
    return this.okrsService.updateKeyResult(id, dto);
  }

  @Delete('key-results/:id')
  @RequirePermission('okrs.delete')
  @ApiOperation({ summary: 'Delete a key result' })
  deleteKeyResult(@Param('id') id: string) {
    return this.okrsService.deleteKeyResult(id);
  }
}
