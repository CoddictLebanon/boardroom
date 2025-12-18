import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import {
  CreateFolderDto,
  UpdateFolderDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  AddTagsDto,
  ListDocumentsQueryDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';
import { Public } from '../auth/decorators';

@ApiTags('documents')
@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
  ) {}

  // ==========================================
  // FOLDERS
  // ==========================================

  @Post('companies/:companyId/folders')
  @ApiOperation({ summary: 'Create a new folder' })
  createFolder(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.documentsService.createFolder(companyId, dto);
  }

  @Get('companies/:companyId/folders')
  @ApiOperation({ summary: 'List all folders for a company' })
  listFolders(@Param('companyId') companyId: string) {
    return this.documentsService.listFolders(companyId);
  }

  @Put('folders/:id')
  @ApiOperation({ summary: 'Update a folder' })
  updateFolder(
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
    @Query('companyId') companyId: string,
  ) {
    return this.documentsService.updateFolder(id, companyId, dto);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Delete a folder' })
  deleteFolder(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.documentsService.deleteFolder(id, companyId);
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================

  @Post('companies/:companyId/documents')
  @ApiOperation({ summary: 'Upload a new document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['MEETING', 'FINANCIAL', 'GOVERNANCE', 'GENERAL'] },
        folderId: { type: 'string' },
      },
      required: ['file', 'name', 'type'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  createDocument(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser('userId') uploaderId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          new FileTypeValidator({
            fileType: /(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.documentsService.createDocument(companyId, uploaderId, dto, file);
  }

  @Get('companies/:companyId/documents')
  @ApiOperation({ summary: 'List documents with optional filters' })
  listDocuments(
    @Param('companyId') companyId: string,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.documentsService.listDocuments(companyId, query);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document details with versions' })
  getDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.documentsService.getDocument(id, companyId);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Get presigned download URL' })
  getDownloadUrl(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.documentsService.getDownloadUrl(id, companyId);
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document metadata' })
  updateDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, companyId, dto);
  }

  @Post('documents/:id/version')
  @ApiOperation({ summary: 'Upload a new version of a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadNewVersion(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @CurrentUser('userId') uploaderId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          new FileTypeValidator({
            fileType: /(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.documentsService.uploadNewVersion(id, companyId, uploaderId, file);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  deleteDocument(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
  ) {
    return this.documentsService.deleteDocument(id, companyId);
  }

  // ==========================================
  // TAGS
  // ==========================================

  @Post('documents/:id/tags')
  @ApiOperation({ summary: 'Add tags to a document' })
  addTags(
    @Param('id') id: string,
    @Query('companyId') companyId: string,
    @Body() dto: AddTagsDto,
  ) {
    return this.documentsService.addTags(id, companyId, dto);
  }

  @Delete('documents/:id/tags/:tag')
  @ApiOperation({ summary: 'Remove a tag from a document' })
  removeTag(
    @Param('id') id: string,
    @Param('tag') tag: string,
    @Query('companyId') companyId: string,
  ) {
    return this.documentsService.removeTag(id, companyId, tag);
  }

  // ==========================================
  // DIRECT FILE DOWNLOAD (for local filesystem)
  // ==========================================

  @Public()
  @Get('documents/download/*path')
  @ApiOperation({ summary: 'Download a file directly from local storage' })
  downloadFile(@Param('path') path: string[], @Res() res: Response) {
    const key = Array.isArray(path) ? path.join('/') : path;
    const decodedKey = decodeURIComponent(key);

    if (!this.storageService.fileExists(decodedKey)) {
      throw new NotFoundException('File not found');
    }

    const fileBuffer = this.storageService.readFile(decodedKey);
    const fileName = decodedKey.split('/').pop() || 'download';

    // Determine content type based on file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  }
}
