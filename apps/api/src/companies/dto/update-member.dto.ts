import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { MemberRole, MemberStatus } from '@prisma/client';

export class UpdateMemberDto {
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  termStart?: string;

  @IsDateString()
  @IsOptional()
  termEnd?: string;

  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;
}
