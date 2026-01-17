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
  @RequirePermission('documents.upload')
  createFolder(
    @Param('companyId') companyId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.documentsService.createFolder(companyId, dto);
  }

  @Get('companies/:companyId/folders')
  @RequirePermission('documents.view')
  listFolders(@Param('companyId') companyId: string) {
    return this.documentsService.listFolders(companyId);
  }

  @Put('companies/:companyId/folders/:id')
  @RequirePermission('documents.upload')
  updateFolder(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.documentsService.updateFolder(id, companyId, dto);
  }

  @Delete('companies/:companyId/folders/:id')
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
    console.log('DEBUG: Received DTO:', JSON.stringify(dto, null, 2));
    console.log('DEBUG: DTO type field:', dto.type, 'typeof:', typeof dto.type);
    return this.documentsService.createDocument(companyId, uploaderId, dto, file);
  }

  @Get('companies/:companyId/documents')
  @RequirePermission('documents.view')
  listDocuments(
    @Param('companyId') companyId: string,
    @Query() query: ListDocumentsQueryDto,
  ) {
    return this.documentsService.listDocuments(companyId, query);
  }

  @Get('companies/:companyId/documents/:id')
  @RequirePermission('documents.view')
  getDocument(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDocument(id, companyId);
  }

  @Get('companies/:companyId/documents/:id/download')
  @RequirePermission('documents.download')
  getDownloadUrl(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDownloadUrl(id, companyId);
  }

  @Put('companies/:companyId/documents/:id')
  @RequirePermission('documents.upload')
  updateDocument(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(id, companyId, dto);
  }

  @Post('companies/:companyId/documents/:id/version')
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
  @RequirePermission('documents.upload')
  addTags(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AddTagsDto,
  ) {
    return this.documentsService.addTags(id, companyId, dto);
  }

  @Delete('companies/:companyId/documents/:id/tags/:tag')
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
