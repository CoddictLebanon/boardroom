import { FinancialReportType } from '@prisma/client';
export declare class UpdateFinancialReportDto {
    type?: FinancialReportType;
    fiscalYear?: number;
    period?: string;
    data?: Record<string, any>;
    storageKey?: string;
}
