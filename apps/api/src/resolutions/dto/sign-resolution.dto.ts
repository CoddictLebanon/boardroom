import { IsEnum } from 'class-validator';
import { SignatureStatus } from '@prisma/client';

export class SignResolutionDto {
  @IsEnum(SignatureStatus)
  status: SignatureStatus;
}
