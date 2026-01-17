import { IsUrl, IsOptional, ValidateIf } from 'class-validator';

export class UpdateSignatureDto {
  @ValidateIf((o) => o.signatureUrl !== null)
  @IsUrl()
  @IsOptional()
  signatureUrl?: string | null;
}
