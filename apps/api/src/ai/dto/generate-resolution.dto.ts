import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty, MaxLength, IsIn, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(10000)
  content: string;
}

export class GenerateResolutionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  conversationHistory?: MessageDto[];

  @IsOptional()
  @IsString()
  currentDraft?: string;
}
