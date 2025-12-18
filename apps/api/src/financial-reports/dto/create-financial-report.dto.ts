import { IsEnum, IsNotEmpty, IsString, IsInt, Min, IsOptional, ValidateIf, IsObject } from 'class-validator';
import { FinancialReportType } from '@prisma/client';

export class CreateFinancialReportDto {
  @IsEnum(FinancialReportType)
  @IsNotEmpty()
  type: FinancialReportType;

  @IsInt()
  @Min(1900)
  @IsNotEmpty()
  fiscalYear: number;

  @IsString()
  @IsNotEmpty()
  period: string; // e.g., "Q1", "January", "Annual"

  @IsObject()
  @IsOptional()
  @ValidateIf((o) => !o.storageKey)
  data?: Record<string, any>; // Structured financial data

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.data)
  storageKey?: string; // PDF/Excel file if uploaded

  // Ensure at least one of data or storageKey is provided
  validate() {
    if (!this.data && !this.storageKey) {
      throw new Error('Either data or storageKey must be provided');
    }
  }
}
