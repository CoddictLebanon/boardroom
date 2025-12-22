import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsNumber, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '@prisma/client';

export class UpdateKeyResultDto {
  @ApiPropertyOptional({ description: 'Key result title', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  title?: string;

  @ApiPropertyOptional({ description: 'Metric type', enum: MetricType })
  @IsEnum(MetricType)
  @IsOptional()
  metricType?: MetricType;

  @ApiPropertyOptional({ description: 'Start value (baseline)' })
  @IsNumber()
  @IsOptional()
  startValue?: number;

  @ApiPropertyOptional({ description: 'Target value (goal)' })
  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Current value' })
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Inverse metric (lower is better)' })
  @IsBoolean()
  @IsOptional()
  inverse?: boolean;

  @ApiPropertyOptional({ description: 'Comment', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
