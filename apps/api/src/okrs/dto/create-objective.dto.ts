import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateObjectiveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
