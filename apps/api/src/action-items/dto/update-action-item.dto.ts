import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Priority, ActionStatus } from '@prisma/client';

export class UpdateActionItemDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
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
}

export class UpdateActionItemStatusDto {
  @IsEnum(ActionStatus)
  status: ActionStatus;
}
