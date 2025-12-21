import { IsString, IsOptional, IsInt, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateObjectiveDto {
  @ApiPropertyOptional({ description: 'Objective title', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
