import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsNumber, MaxLength, Min } from 'class-validator';
import { MetricType } from '@prisma/client';

export class UpdateKeyResultDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  title?: string;

  @IsEnum(MetricType)
  @IsOptional()
  metricType?: MetricType;

  @IsNumber()
  @IsOptional()
  startValue?: number;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @IsBoolean()
  @IsOptional()
  inverse?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
