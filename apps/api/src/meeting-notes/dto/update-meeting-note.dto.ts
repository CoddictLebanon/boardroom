import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateMeetingNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content!: string;
}
