import { IsString, IsNotEmpty, IsBoolean, IsEnum, IsUUID } from 'class-validator';

export class JoinMeetingDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId: string;
}

export class LeaveMeetingDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
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
  @IsUUID()
  decisionId: string;

  @IsEnum(VoteOption)
  vote: VoteOption;
}

export class UpdateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
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
  @IsUUID()
  meetingId: string;

  @IsEnum(MeetingStatusOption)
  status: MeetingStatusOption;
}
