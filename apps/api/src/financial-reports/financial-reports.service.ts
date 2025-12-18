import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinancialReportDto, UpdateFinancialReportDto } from './dto';
import { FinancialReportType, ReportStatus } from '@prisma/client';

@Injectable()
export class FinancialReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateFinancialReportDto) {
    // Validate that either data or storageKey is provided
    if (!dto.data && !dto.storageKey) {
      throw new BadRequestException('Either data or storageKey must be provided');
    }

    // Validate company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    return this.prisma.financialReport.create({
      data: {
        companyId,
        type: dto.type,
        fiscalYear: dto.fiscalYear,
        period: dto.period,
        ...(dto.data && { data: dto.data }),
        ...(dto.storageKey && { storageKey: dto.storageKey }),
        status: ReportStatus.DRAFT,
      },
    });
  }

  async findAll(
    companyId: string,
    filters?: {
      type?: FinancialReportType;
      fiscalYear?: number;
      period?: string;
      status?: ReportStatus;
    },
  ) {
    return this.prisma.financialReport.findMany({
      where: {
        companyId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.fiscalYear && { fiscalYear: filters.fiscalYear }),
        ...(filters?.period && { period: filters.period }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: [
        { fiscalYear: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Financial report with ID ${id} not found`);
    }

    return report;
  }

  async update(id: string, dto: UpdateFinancialReportDto) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Financial report with ID ${id} not found`);
    }

    // Cannot modify FINAL reports
    if (report.status === ReportStatus.FINAL) {
      throw new ForbiddenException('Cannot modify a finalized report');
    }

    return this.prisma.financialReport.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.fiscalYear && { fiscalYear: dto.fiscalYear }),
        ...(dto.period && { period: dto.period }),
        ...(dto.data !== undefined && { data: dto.data }),
        ...(dto.storageKey !== undefined && { storageKey: dto.storageKey }),
      },
    });
  }

  async finalize(id: string) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Financial report with ID ${id} not found`);
    }

    if (report.status === ReportStatus.FINAL) {
      throw new BadRequestException('Report is already finalized');
    }

    return this.prisma.financialReport.update({
      where: { id },
      data: { status: ReportStatus.FINAL },
    });
  }

  async remove(id: string) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Financial report with ID ${id} not found`);
    }

    // Can only delete DRAFT reports
    if (report.status === ReportStatus.FINAL) {
      throw new ForbiddenException('Cannot delete a finalized report');
    }

    return this.prisma.financialReport.delete({
      where: { id },
    });
  }

  async uploadFile(id: string, storageKey: string) {
    const report = await this.prisma.financialReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Financial report with ID ${id} not found`);
    }

    // Cannot modify FINAL reports
    if (report.status === ReportStatus.FINAL) {
      throw new ForbiddenException('Cannot modify a finalized report');
    }

    return this.prisma.financialReport.update({
      where: { id },
      data: { storageKey },
    });
  }
}
