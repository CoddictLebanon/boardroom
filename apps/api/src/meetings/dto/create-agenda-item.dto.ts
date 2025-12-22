import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgendaItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  duration?: number;
}
