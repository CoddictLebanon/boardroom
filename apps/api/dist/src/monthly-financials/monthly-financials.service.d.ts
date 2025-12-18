import { PrismaService } from '../prisma/prisma.service';
import { UpsertMonthlyFinancialDto } from './dto/upsert-monthly-financial.dto';
import { Decimal } from '@prisma/client/runtime/library';
export declare class MonthlyFinancialsService {
    private prisma;
    constructor(prisma: PrismaService);
    verifyCompanyAccess(companyId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        role: import("@prisma/client").$Enums.MemberRole;
        title: string | null;
        userId: string;
        companyId: string;
        termStart: Date | null;
        termEnd: Date | null;
        status: import("@prisma/client").$Enums.MemberStatus;
    }>;
    getYearData(companyId: string, year: number): Promise<any[]>;
    upsertMonth(companyId: string, year: number, month: number, dto: UpsertMonthlyFinancialDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        year: number;
        month: number;
        companyId: string;
        revenue: Decimal;
        cost: Decimal;
        profit: Decimal;
        pdfPath: string | null;
    }>;
    savePdf(companyId: string, year: number, month: number, file: Express.Multer.File): Promise<{
        success: boolean;
    }>;
    getPdfPath(companyId: string, year: number, month: number): Promise<string>;
    deletePdf(companyId: string, year: number, month: number): Promise<{
        success: boolean;
    }>;
}
