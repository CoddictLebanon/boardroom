import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateObjectiveDto {
  @ApiProperty({ description: 'Objective title', maxLength: 500, example: 'Mitigate PPC Risk' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ description: 'Display order', example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
