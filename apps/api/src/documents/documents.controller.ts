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
  UseGuards,
  ForbiddenException,
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
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@ApiTags('documents')
@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
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
  @RequirePermission('documents.upload')
  createFolder(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.documentsService.createFolder(companyId, dto);
  }

  @Get('companies/:companyId/folders')
  @ApiOperation({ summary: 'List all folders for a company' })
  @RequirePermission('documents.view')
  listFolders(@Param('companyId') companyId: string) {
    return this.documentsService.listFolders(companyId);
  }

  @Put('companies/:companyId/folders/:id')
  @ApiOperation({ summary: 'Update a folder' })
  @RequirePermission('documents.upload')
  updateFolder(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.documentsService.updateFolder(id, companyId, dto);
  }

  @Delete('companies/:companyId/folders/:id')
  @ApiOperation({ summary: 'Delete a folder' })
  @RequirePermission('documents.delete')
  deleteFolder(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
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
  @RequirePermission('documents.upload')
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
  @RequirePermission('documents.view')
  listDocuments(
    @Param('companyId') companyId: string,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.documentsService.listDocuments(companyId, query);
  }

  @Get('companies/:companyId/documents/:id')
  @ApiOperation({ summary: 'Get document details with versions' })
  @RequirePermission('documents.view')
  getDocument(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDocument(id, companyId);
  }

  @Get('companies/:companyId/documents/:id/download')
  @ApiOperation({ summary: 'Get presigned download URL' })
  @RequirePermission('documents.download')
  getDownloadUrl(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDownloadUrl(id, companyId);
  }

  @Put('companies/:companyId/documents/:id')
  @ApiOperation({ summary: 'Update document metadata' })
  @RequirePermission('documents.upload')
  updateDocument(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, companyId, dto);
  }

  @Post('companies/:companyId/documents/:id/version')
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
  @RequirePermission('documents.upload')
  uploadNewVersion(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
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

  @Delete('companies/:companyId/documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  @RequirePermission('documents.delete')
  deleteDocument(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.deleteDocument(id, companyId);
  }

  // ==========================================
  // TAGS
  // ==========================================

  @Post('companies/:companyId/documents/:id/tags')
  @ApiOperation({ summary: 'Add tags to a document' })
  @RequirePermission('documents.upload')
  addTags(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AddTagsDto,
  ) {
    return this.documentsService.addTags(id, companyId, dto);
  }

  @Delete('companies/:companyId/documents/:id/tags/:tag')
  @ApiOperation({ summary: 'Remove a tag from a document' })
  @RequirePermission('documents.upload')
  removeTag(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('tag') tag: string,
  ) {
    return this.documentsService.removeTag(id, companyId, tag);
  }

  // ==========================================
  // DIRECT FILE DOWNLOAD (for local filesystem)
  // Uses signed URLs for security - no authentication required
  // but URL must have valid signature and not be expired
  // ==========================================

  @Public()
  @Get('documents/download/*path')
  @ApiOperation({ summary: 'Download a file directly from local storage (requires signed URL)' })
  downloadFile(
    @Param('path') path: string[],
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() res: Response,
  ) {
    const key = Array.isArray(path) ? path.join('/') : path;
    const decodedKey = decodeURIComponent(key);

    // Verify the signed URL
    if (!expires || !signature) {
      throw new ForbiddenException('Invalid download URL - missing signature');
    }

    const expiresNum = parseInt(expires, 10);
    if (isNaN(expiresNum)) {
      throw new ForbiddenException('Invalid download URL - invalid expiration');
    }

    if (!this.storageService.verifySignature(decodedKey, expiresNum, signature)) {
      throw new ForbiddenException('Invalid or expired download URL');
    }

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
