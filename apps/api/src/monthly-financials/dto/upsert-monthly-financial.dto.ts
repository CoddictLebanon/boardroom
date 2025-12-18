import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMonthlyFinancialDto {
  @IsNumber()
  @Type(() => Number)
  revenue: number;

  @IsNumber()
  @Type(() => Number)
  cost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
