import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';

export class CreateOkrPeriodDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}
