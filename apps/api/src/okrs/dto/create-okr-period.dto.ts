import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOkrPeriodDto {
  @ApiProperty({ description: 'Period name', maxLength: 255, example: '2025 Q2 Product OKRs' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Start date in ISO format', example: '2025-04-01T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ description: 'End date in ISO format', example: '2025-06-30T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}
