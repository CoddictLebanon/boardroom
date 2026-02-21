import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  votingEnabled?: boolean;
}
