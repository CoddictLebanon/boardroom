import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class UpdateOkrPeriodDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
