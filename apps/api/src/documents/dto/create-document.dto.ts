import { IsString, IsOptional, IsEnum, IsArray, MaxLength, IsUUID, ArrayMaxSize, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsIn(['MEETING', 'FINANCIAL', 'GOVERNANCE', 'GENERAL'])
  @Transform(({ value }) => value as DocumentType)
  type: DocumentType;

  @IsString()
  @IsOptional()
  folderId?: string;

  @IsString()
  @IsOptional()
  meetingId?: string;
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @IsOptional()
  folderId?: string;
}

export class AddTagsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(50, { each: true })
  tags: string[];
}

export class ListDocumentsQueryDto {
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @IsOptional()
  folderId?: string;

  @IsString()
  @IsOptional()
  tag?: string;
}
