import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMonthlyFinancialDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  revenue: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
