import { IsBoolean, IsNotEmpty } from 'class-validator';

export class MarkAttendanceDto {
  @IsBoolean()
  @IsNotEmpty()
  isPresent: boolean;
}
