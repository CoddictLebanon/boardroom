import { IsUrl, IsOptional, ValidateIf } from 'class-validator';

export class UpdateSignatureDto {
  @ValidateIf((o) => o.signatureUrl !== null)
  @IsUrl({ require_tld: false }, { message: 'signatureUrl must be a valid URL' })
  @IsOptional()
  signatureUrl?: string | null;
}
