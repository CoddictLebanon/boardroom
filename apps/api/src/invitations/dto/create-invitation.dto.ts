import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @IsString()
  @IsOptional()
  title?: string;
}
