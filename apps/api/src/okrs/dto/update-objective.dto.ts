import { IsString, IsOptional, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateObjectiveDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
