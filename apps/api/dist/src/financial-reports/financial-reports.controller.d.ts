import { FinancialReportsService } from './financial-reports.service';
import { CreateFinancialReportDto, UpdateFinancialReportDto } from './dto';
import { FinancialReportType, ReportStatus } from '@prisma/client';
export declare class FinancialReportsController {
    private readonly financialReportsService;
    constructor(financialReportsService: FinancialReportsService);
    create(companyId: string, createDto: CreateFinancialReportDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.FinancialReportType;
        companyId: string;
        status: import("@prisma/client").$Enums.ReportStatus;
        storageKey: string | null;
        fiscalYear: number;
        period: string;
    }>;
    findAll(companyId: string, type?: FinancialReportType, fiscalYear?: string, period?: string, status?: ReportStatus): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.FinancialReportType;
        companyId: string;
        status: import("@prisma/client").$Enums.ReportStatus;
        storageKey: string | null;
        fiscalYear: number;
        period: string;
    }[]>;
    findOne(id: string): Promise<{
        company: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.FinancialReportType;
        companyId: string;
        status: import("@prisma/client").$Enums.ReportStatus;
        storageKey: string | null;
        fiscalYear: number;
        period: string;
    }>;
    update(id: string, updateDto: UpdateFinancialReportDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.FinancialReportType;
        companyId: string;
        status: import("@prisma/client").$Enums.ReportStatus;
        storageKey: string | null;
        fiscalYear: number;
        period: string;
    }>;
    finalize(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.FinancialReportType;
        companyId: string;
        status: import("@prisma/client").$Enums.ReportStatus;
        storageKey: string | null;
        fiscalYear: number;
        period: string;
    }>;
    remove(id: string): Promise<void>;
    uploadFile(id: string, storageKey: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        type: import("@prisma/client").$Enums.FinancialReportType;
        companyId: string;
        status: import("@prisma/client").$Enums.ReportStatus;
        storageKey: string | null;
        fiscalYear: number;
        period: string;
    }>;
}
