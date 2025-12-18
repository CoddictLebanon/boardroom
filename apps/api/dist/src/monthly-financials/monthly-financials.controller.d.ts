import type { Response } from 'express';
import { MonthlyFinancialsService } from './monthly-financials.service';
import { UpsertMonthlyFinancialDto } from './dto/upsert-monthly-financial.dto';
export declare class MonthlyFinancialsController {
    private readonly monthlyFinancialsService;
    constructor(monthlyFinancialsService: MonthlyFinancialsService);
    getYearData(companyId: string, year: number, userId: string): Promise<any[]>;
    upsertMonth(companyId: string, year: number, month: number, dto: UpsertMonthlyFinancialDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        year: number;
        month: number;
        companyId: string;
        revenue: import("@prisma/client/runtime/library").Decimal;
        cost: import("@prisma/client/runtime/library").Decimal;
        profit: import("@prisma/client/runtime/library").Decimal;
        pdfPath: string | null;
    }>;
    uploadPdf(companyId: string, year: number, month: number, file: Express.Multer.File, userId: string): Promise<{
        success: boolean;
    }>;
    downloadPdf(companyId: string, year: number, month: number, userId: string, res: Response): Promise<void>;
    deletePdf(companyId: string, year: number, month: number, userId: string): Promise<{
        success: boolean;
    }>;
}
