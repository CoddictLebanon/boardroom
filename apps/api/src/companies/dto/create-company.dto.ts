import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  logo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  timezone?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  fiscalYearStart?: number;
}
