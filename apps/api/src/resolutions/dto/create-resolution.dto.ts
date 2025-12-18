import { IsString, IsEnum, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { ResolutionCategory, ResolutionStatus } from '@prisma/client';

export class CreateResolutionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(ResolutionCategory)
  @IsNotEmpty()
  category: ResolutionCategory;

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
