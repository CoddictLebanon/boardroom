import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class AddAttendeesDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  memberIds: string[];
}
