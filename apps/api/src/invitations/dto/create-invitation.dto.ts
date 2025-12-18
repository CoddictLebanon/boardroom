import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email address to invite' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: MemberRole, description: 'Role for the invited user' })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @ApiPropertyOptional({ description: 'Title for the invited user' })
  @IsString()
  @IsOptional()
  title?: string;
}
