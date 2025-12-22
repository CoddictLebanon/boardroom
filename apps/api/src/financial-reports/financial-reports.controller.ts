import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FinancialReportsService } from './financial-reports.service';
import { CreateFinancialReportDto, UpdateFinancialReportDto } from './dto';
import { FinancialReportType, ReportStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard } from '../permissions/permission.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Post('companies/:companyId/financial-reports')
  @RequirePermission('financials.edit')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Param('companyId') companyId: string,
    @Body() createDto: CreateFinancialReportDto,
  ) {
    return this.financialReportsService.create(companyId, createDto);
  }

  @Get('companies/:companyId/financial-reports')
  @RequirePermission('financials.view')
  async findAll(
    @Param('companyId') companyId: string,
    @Query('type') type?: FinancialReportType,
    @Query('fiscalYear') fiscalYear?: string,
    @Query('period') period?: string,
    @Query('status') status?: ReportStatus,
  ) {
    const filters = {
      ...(type && { type }),
      ...(fiscalYear && { fiscalYear: parseInt(fiscalYear, 10) }),
      ...(period && { period }),
      ...(status && { status }),
    };

    return this.financialReportsService.findAll(companyId, filters);
  }

  @Get('companies/:companyId/financial-reports/:id')
  @RequirePermission('financials.view')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.financialReportsService.findOne(id, companyId);
  }

  @Put('companies/:companyId/financial-reports/:id')
  @RequirePermission('financials.edit')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateFinancialReportDto,
  ) {
    return this.financialReportsService.update(id, companyId, updateDto);
  }

  @Put('companies/:companyId/financial-reports/:id/finalize')
  @RequirePermission('financials.edit')
  @HttpCode(HttpStatus.OK)
  async finalize(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.financialReportsService.finalize(id, companyId);
  }

  @Delete('companies/:companyId/financial-reports/:id')
  @RequirePermission('financials.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    await this.financialReportsService.remove(id, companyId);
  }

  @Post('companies/:companyId/financial-reports/:id/upload')
  @RequirePermission('financials.edit')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async uploadFile(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('storageKey') storageKey: string,
  ) {
    return this.financialReportsService.uploadFile(id, companyId, storageKey);
  }
}
