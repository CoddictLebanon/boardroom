import { IsString, IsOptional, IsUrl, ValidateIf, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  position?: string | null;

  @ValidateIf((o) => o.signatureUrl !== null)
  @IsUrl({ require_tld: false }, { message: 'signatureUrl must be a valid URL' })
  @IsOptional()
  signatureUrl?: string | null;
}
