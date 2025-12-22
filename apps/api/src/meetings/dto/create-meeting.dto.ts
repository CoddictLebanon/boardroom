import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, Min, IsArray, MaxLength, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
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
  @MaxLength(500)
  location?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @IsUrl({}, { message: 'videoLink must be a valid URL' })
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
