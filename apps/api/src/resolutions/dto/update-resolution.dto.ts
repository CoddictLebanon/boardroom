import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ResolutionCategory, ResolutionStatus } from '@prisma/client';

export class UpdateResolutionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(ResolutionCategory)
  @IsOptional()
  category?: ResolutionCategory;

  @IsEnum(ResolutionStatus)
  @IsOptional()
  status?: ResolutionStatus;

  @IsString()
  @IsOptional()
  decisionId?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}
