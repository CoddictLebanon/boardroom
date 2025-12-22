import { IsString, IsEnum, IsOptional, IsDateString, IsNotEmpty, MaxLength, IsUUID } from 'class-validator';
import { ResolutionCategory, ResolutionStatus } from '@prisma/client';

export class CreateResolutionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @IsEnum(ResolutionCategory)
  @IsNotEmpty()
  category: ResolutionCategory;

  @IsEnum(ResolutionStatus)
  @IsOptional()
  status?: ResolutionStatus;

  @IsString()
  @IsOptional()
  @IsUUID()
  decisionId?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;
}
