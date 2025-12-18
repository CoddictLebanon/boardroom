import { FinancialReportType } from '@prisma/client';
export declare class CreateFinancialReportDto {
    type: FinancialReportType;
    fiscalYear: number;
    period: string;
    data?: Record<string, any>;
    storageKey?: string;
    validate(): void;
}
