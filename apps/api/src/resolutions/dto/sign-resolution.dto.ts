import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SignatureStatus } from '@prisma/client';

export class SignResolutionDto {
  @IsEnum(SignatureStatus)
  status: SignatureStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
