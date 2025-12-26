import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACTOR = 'CONTRACTOR',
}

export class CreateOrgRoleDto {
  @ApiProperty({ description: 'Role title', example: 'Engineering Lead' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ description: 'Person name (leave empty for vacant role)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  personName?: string;

  @ApiPropertyOptional({ description: 'Role responsibilities (markdown)' })
  @IsString()
  @IsOptional()
  responsibilities?: string;

  @ApiPropertyOptional({ description: 'Department name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Employment type', enum: EmploymentType })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Parent role ID (null for root)' })
  @IsString()
  @IsOptional()
  parentId?: string;
}
