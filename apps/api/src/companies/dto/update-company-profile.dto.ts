import { IsString, IsOptional, IsUrl, IsEmail, MaxLength, ValidateIf } from 'class-validator';

export class UpdateCompanyProfileDto {
  @ValidateIf((o) => o.logo !== null && o.logo !== '')
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  @IsOptional()
  logo?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  country?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  postalCode?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  registrationNo?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  phone?: string;

  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  companyEmail?: string;

  @ValidateIf((o) => o.website !== null && o.website !== '')
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  @IsOptional()
  website?: string;

  @ValidateIf((o) => o.stampUrl !== null && o.stampUrl !== '')
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  @IsOptional()
  stampUrl?: string;
}
