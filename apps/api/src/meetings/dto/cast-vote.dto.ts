import { IsEnum, IsNotEmpty } from 'class-validator';

export enum VoteType {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
  ABSTAIN = 'ABSTAIN',
}

export class CastVoteDto {
  @IsEnum(VoteType)
  @IsNotEmpty()
  vote: VoteType;
}
