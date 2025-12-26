import { IsString, IsOptional, MaxLength, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType } from './create-org-role.dto';

export class UpdateOrgRoleDto {
  @ApiPropertyOptional({ description: 'Role title' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Person name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  personName?: string | null;

  @ApiPropertyOptional({ description: 'Role responsibilities' })
  @IsString()
  @IsOptional()
  responsibilities?: string | null;

  @ApiPropertyOptional({ description: 'Department name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string | null;

  @ApiPropertyOptional({ description: 'Employment type', enum: EmploymentType })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType | null;

  @ApiPropertyOptional({ description: 'Parent role ID' })
  @IsString()
  @IsOptional()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Canvas X position' })
  @IsNumber()
  @IsOptional()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Canvas Y position' })
  @IsNumber()
  @IsOptional()
  positionY?: number;
}
