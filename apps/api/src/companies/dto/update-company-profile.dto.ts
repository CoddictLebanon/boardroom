import { IsString, IsOptional, IsUrl, IsEmail, MaxLength } from 'class-validator';

export class UpdateCompanyProfileDto {
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

  @IsUrl()
  @MaxLength(500)
  @IsOptional()
  website?: string;

  @IsUrl()
  @MaxLength(500)
  @IsOptional()
  stampUrl?: string;
}
