import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, MaxLength, IsUUID } from 'class-validator';
import { Priority, ActionStatus } from '@prisma/client';

export class CreateActionItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(ActionStatus)
  @IsOptional()
  status?: ActionStatus;

  @IsString()
  @IsOptional()
  @IsUUID()
  meetingId?: string;

  @IsString()
  @IsOptional()
  @IsUUID()
  agendaItemId?: string;
}
