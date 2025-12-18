import { PrismaService } from '../prisma/prisma.service';
import { CreateFinancialReportDto, UpdateFinancialReportDto } from './dto';
import { FinancialReportType, ReportStatus } from '@prisma/client';
export declare class FinancialReportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateFinancialReportDto): Promise<{
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
    findAll(companyId: string, filters?: {
        type?: FinancialReportType;
        fiscalYear?: number;
        period?: string;
        status?: ReportStatus;
    }): Promise<{
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
    update(id: string, dto: UpdateFinancialReportDto): Promise<{
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
    remove(id: string): Promise<{
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
