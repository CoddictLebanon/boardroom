import { IsUrl, IsOptional } from 'class-validator';

export class UpdateSignatureDto {
  @IsUrl()
  @IsOptional()
  signatureUrl?: string;
}
