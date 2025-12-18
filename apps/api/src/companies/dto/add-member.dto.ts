import { IsString, IsEnum, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

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
}
