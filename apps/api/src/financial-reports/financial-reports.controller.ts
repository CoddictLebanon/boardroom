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
} from '@nestjs/common';
import { FinancialReportsService } from './financial-reports.service';
import { CreateFinancialReportDto, UpdateFinancialReportDto } from './dto';
import { FinancialReportType, ReportStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';

@Controller()
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Post('companies/:companyId/financial-reports')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Param('companyId') companyId: string,
    @Body() createDto: CreateFinancialReportDto,
  ) {
    return this.financialReportsService.create(companyId, createDto);
  }

  @Get('companies/:companyId/financial-reports')
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

  @Get('financial-reports/:id')
  async findOne(@Param('id') id: string) {
    return this.financialReportsService.findOne(id);
  }

  @Put('financial-reports/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFinancialReportDto,
  ) {
    return this.financialReportsService.update(id, updateDto);
  }

  @Put('financial-reports/:id/finalize')
  @HttpCode(HttpStatus.OK)
  async finalize(@Param('id') id: string) {
    return this.financialReportsService.finalize(id);
  }

  @Delete('financial-reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.financialReportsService.remove(id);
  }

  @Post('financial-reports/:id/upload')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async uploadFile(
    @Param('id') id: string,
    @Body('storageKey') storageKey: string,
  ) {
    return this.financialReportsService.uploadFile(id, storageKey);
  }
}
