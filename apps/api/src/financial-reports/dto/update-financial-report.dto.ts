import { IsEnum, IsString, IsInt, Min, IsOptional, IsObject } from 'class-validator';
import { FinancialReportType } from '@prisma/client';

export class UpdateFinancialReportDto {
  @IsEnum(FinancialReportType)
  @IsOptional()
  type?: FinancialReportType;

  @IsInt()
  @Min(1900)
  @IsOptional()
  fiscalYear?: number;

  @IsString()
  @IsOptional()
  period?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  storageKey?: string;
}
