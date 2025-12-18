import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  videoLink?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attendeeIds?: string[];

  @IsArray()
  @IsOptional()
  agendaItems?: {
    title: string;
    description?: string;
    duration?: number;
  }[];
}
