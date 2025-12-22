import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMeetingNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content!: string;
}
