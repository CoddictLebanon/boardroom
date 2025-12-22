import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdateRolePermissionsDto {
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  @IsOptional()
  @IsString()
  customRoleId?: string;

  @IsObject()
  permissions!: Record<string, boolean>;
}
