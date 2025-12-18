import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DocumentType, description: 'Document type' })
  @IsEnum(DocumentType)
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
  name?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsString()
  @IsOptional()
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
