import { IsString, IsOptional, MaxLength, IsEnum, IsNumber } from 'class-validator';
import { EmploymentType } from './create-org-role.dto';

export class UpdateOrgRoleDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  personName?: string | null;

  @IsString()
  @IsOptional()
  responsibilities?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string | null;

  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType | null;

  @IsString()
  @IsOptional()
  parentId?: string | null;

  @IsNumber()
  @IsOptional()
  positionX?: number;

  @IsNumber()
  @IsOptional()
  positionY?: number;
}
