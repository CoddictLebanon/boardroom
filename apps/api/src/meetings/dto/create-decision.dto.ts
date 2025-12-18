import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDecisionDto {
  @IsString()
  @IsOptional()
  agendaItemId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}
