import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMonthlyFinancialDto } from './dto/upsert-monthly-financial.dto';
import { Decimal } from '@prisma/client/runtime/library';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MonthlyFinancialsService {
  constructor(private prisma: PrismaService) {}

  async verifyCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { companyId, userId, status: 'ACTIVE' },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to this company');
    }
    return membership;
  }

  async getYearData(companyId: string, year: number) {
    const records = await this.prisma.monthlyFinancial.findMany({
      where: { companyId, year },
      orderBy: { month: 'asc' },
    });

    // Return array with all 12 months, filling in missing ones with null values
    const monthsData: any[] = [];
    for (let month = 1; month <= 12; month++) {
      const record = records.find((r) => r.month === month);
      if (record) {
        monthsData.push({
          ...record,
          revenue: Number(record.revenue),
          cost: Number(record.cost),
          profit: Number(record.profit),
        });
      } else {
        monthsData.push({
          id: null,
          companyId,
          year,
          month,
          revenue: null,
          cost: null,
          profit: null,
          pdfPath: null,
          notes: null,
        });
      }
    }
    return monthsData;
  }

  async upsertMonth(
    companyId: string,
    year: number,
    month: number,
    dto: UpsertMonthlyFinancialDto,
  ) {
    const profit = dto.revenue - dto.cost;

    return this.prisma.monthlyFinancial.upsert({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      create: {
        companyId,
        year,
        month,
        revenue: new Decimal(dto.revenue),
        cost: new Decimal(dto.cost),
        profit: new Decimal(profit),
        notes: dto.notes,
      },
      update: {
        revenue: new Decimal(dto.revenue),
        cost: new Decimal(dto.cost),
        profit: new Decimal(profit),
        notes: dto.notes,
      },
    });
  }

  async savePdf(
    companyId: string,
    year: number,
    month: number,
    file: Express.Multer.File,
  ) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'financials', companyId, String(year));

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${month}.pdf`);
    fs.writeFileSync(filePath, file.buffer);

    // Update record with PDF path
    await this.prisma.monthlyFinancial.upsert({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      create: {
        companyId,
        year,
        month,
        revenue: new Decimal(0),
        cost: new Decimal(0),
        profit: new Decimal(0),
        pdfPath: filePath,
      },
      update: {
        pdfPath: filePath,
      },
    });

    return { pdfPath: filePath };
  }

  async getPdfPath(companyId: string, year: number, month: number) {
    const record = await this.prisma.monthlyFinancial.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    if (!record?.pdfPath || !fs.existsSync(record.pdfPath)) {
      throw new NotFoundException('PDF not found');
    }

    return record.pdfPath;
  }

  async deletePdf(companyId: string, year: number, month: number) {
    const record = await this.prisma.monthlyFinancial.findUnique({
      where: {
        companyId_year_month: { companyId, year, month },
      },
    });

    if (record?.pdfPath && fs.existsSync(record.pdfPath)) {
      fs.unlinkSync(record.pdfPath);
    }

    await this.prisma.monthlyFinancial.update({
      where: {
        companyId_year_month: { companyId, year, month },
      },
      data: { pdfPath: null },
    });

    return { success: true };
  }
}
