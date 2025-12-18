import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { MonthlyFinancialsService } from './monthly-financials.service';
import { UpsertMonthlyFinancialDto } from './dto/upsert-monthly-financial.dto';
import * as fs from 'fs';

@Controller()
@UseGuards(ClerkAuthGuard)
export class MonthlyFinancialsController {
  constructor(private readonly monthlyFinancialsService: MonthlyFinancialsService) {}

  @Get('companies/:companyId/monthly-financials')
  async getYearData(
    @Param('companyId') companyId: string,
    @Query('year', ParseIntPipe) year: number,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.getYearData(companyId, year);
  }

  @Put('companies/:companyId/monthly-financials/:year/:month')
  async upsertMonth(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @Body() dto: UpsertMonthlyFinancialDto,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.upsertMonth(companyId, year, month, dto);
  }

  @Post('companies/:companyId/monthly-financials/:year/:month/pdf')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  }))
  async uploadPdf(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() userId: string,
  ) {
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.savePdf(companyId, year, month, file);
  }

  @Get('companies/:companyId/monthly-financials/:year/:month/pdf')
  async downloadPdf(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @CurrentUser() userId: string,
    @Res() res: Response,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    const pdfPath = await this.monthlyFinancialsService.getPdfPath(companyId, year, month);
    const fileStream = fs.createReadStream(pdfPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${month}-${year}.pdf"`);
    fileStream.pipe(res);
  }

  @Delete('companies/:companyId/monthly-financials/:year/:month/pdf')
  async deletePdf(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
    @CurrentUser() userId: string,
  ) {
    await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
    return this.monthlyFinancialsService.deletePdf(companyId, year, month);
  }
}
