import { IsString, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';

export class JoinMeetingDto {
  @IsString()
  @IsNotEmpty()
  meetingId: string;
}

export class LeaveMeetingDto {
  @IsString()
  @IsNotEmpty()
  meetingId: string;
}

export enum VoteOption {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
  ABSTAIN = 'ABSTAIN',
}

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  decisionId: string;

  @IsEnum(VoteOption)
  vote: VoteOption;
}

export class UpdateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  meetingId: string;

  @IsBoolean()
  isPresent: boolean;
}

export enum MeetingStatusOption {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateMeetingStatusDto {
  @IsString()
  @IsNotEmpty()
  meetingId: string;

  @IsEnum(MeetingStatusOption)
  status: MeetingStatusOption;
}
