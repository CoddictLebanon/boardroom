import { IsString, IsOptional, IsEnum, IsArray, MaxLength, IsUUID, ArrayMaxSize, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: DocumentType, description: 'Document type' })
  @IsIn(['MEETING', 'FINANCIAL', 'GOVERNANCE', 'GENERAL'])
  @Transform(({ value }) => value as DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ description: 'Folder ID' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Meeting ID to attach this document to' })
  @IsString()
  @IsOptional()
  meetingId?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: DocumentType, description: 'Document type' })
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @ApiPropertyOptional({ description: 'Folder ID' })
  @IsString()
  @IsOptional()
  folderId?: string;
}

export class AddTagsDto {
  @ApiProperty({ description: 'Tags to add', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(50, { each: true })
  tags: string[];
}

export class ListDocumentsQueryDto {
  @ApiPropertyOptional({ enum: DocumentType, description: 'Filter by document type' })
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @ApiPropertyOptional({ description: 'Filter by folder ID' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsString()
  @IsOptional()
  tag?: string;
}
