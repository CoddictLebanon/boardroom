import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, IsInt, IsNumber, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '@prisma/client';

export class CreateKeyResultDto {
  @ApiProperty({ description: 'Key result title', maxLength: 1000, example: 'Acquire 40,000 Customers from PPC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  title!: string;

  @ApiPropertyOptional({ description: 'Metric type', enum: MetricType, default: 'NUMERIC' })
  @IsEnum(MetricType)
  @IsOptional()
  metricType?: MetricType;

  @ApiProperty({ description: 'Start value (baseline)', example: 30000 })
  @IsNumber()
  @IsNotEmpty()
  startValue!: number;

  @ApiProperty({ description: 'Target value (goal)', example: 40000 })
  @IsNumber()
  @IsNotEmpty()
  targetValue!: number;

  @ApiPropertyOptional({ description: 'Current value', example: 30000 })
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Inverse metric (lower is better)', default: false })
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
