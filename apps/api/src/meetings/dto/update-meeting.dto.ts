import { IsString, IsOptional, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateMeetingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  videoLink?: string;

  @IsEnum(MeetingStatus)
  @IsOptional()
  status?: MeetingStatus;
}
