"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let FinancialReportsService = class FinancialReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        if (!dto.data && !dto.storageKey) {
            throw new common_1.BadRequestException('Either data or storageKey must be provided');
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException(`Company with ID ${companyId} not found`);
        }
        return this.prisma.financialReport.create({
            data: {
                companyId,
                type: dto.type,
                fiscalYear: dto.fiscalYear,
                period: dto.period,
                ...(dto.data && { data: dto.data }),
                ...(dto.storageKey && { storageKey: dto.storageKey }),
                status: client_1.ReportStatus.DRAFT,
            },
        });
    }
    async findAll(companyId, filters) {
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Financial report with ID ${id} not found`);
        }
        return report;
    }
    async update(id, dto) {
        const report = await this.prisma.financialReport.findUnique({
            where: { id },
        });
        if (!report) {
            throw new common_1.NotFoundException(`Financial report with ID ${id} not found`);
        }
        if (report.status === client_1.ReportStatus.FINAL) {
            throw new common_1.ForbiddenException('Cannot modify a finalized report');
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
    async finalize(id) {
        const report = await this.prisma.financialReport.findUnique({
            where: { id },
        });
        if (!report) {
            throw new common_1.NotFoundException(`Financial report with ID ${id} not found`);
        }
        if (report.status === client_1.ReportStatus.FINAL) {
            throw new common_1.BadRequestException('Report is already finalized');
        }
        return this.prisma.financialReport.update({
            where: { id },
            data: { status: client_1.ReportStatus.FINAL },
        });
    }
    async remove(id) {
        const report = await this.prisma.financialReport.findUnique({
            where: { id },
        });
        if (!report) {
            throw new common_1.NotFoundException(`Financial report with ID ${id} not found`);
        }
        if (report.status === client_1.ReportStatus.FINAL) {
            throw new common_1.ForbiddenException('Cannot delete a finalized report');
        }
        return this.prisma.financialReport.delete({
            where: { id },
        });
    }
    async uploadFile(id, storageKey) {
        const report = await this.prisma.financialReport.findUnique({
            where: { id },
        });
        if (!report) {
            throw new common_1.NotFoundException(`Financial report with ID ${id} not found`);
        }
        if (report.status === client_1.ReportStatus.FINAL) {
            throw new common_1.ForbiddenException('Cannot modify a finalized report');
        }
        return this.prisma.financialReport.update({
            where: { id },
            data: { storageKey },
        });
    }
};
exports.FinancialReportsService = FinancialReportsService;
exports.FinancialReportsService = FinancialReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinancialReportsService);
//# sourceMappingURL=financial-reports.service.js.map