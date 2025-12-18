"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const documents_service_1 = require("./documents.service");
const storage_service_1 = require("./storage.service");
const dto_1 = require("./dto");
const decorators_1 = require("../auth/decorators");
const decorators_2 = require("../auth/decorators");
let DocumentsController = class DocumentsController {
    documentsService;
    storageService;
    constructor(documentsService, storageService) {
        this.documentsService = documentsService;
        this.storageService = storageService;
    }
    createFolder(companyId, dto) {
        return this.documentsService.createFolder(companyId, dto);
    }
    listFolders(companyId) {
        return this.documentsService.listFolders(companyId);
    }
    updateFolder(id, dto, companyId) {
        return this.documentsService.updateFolder(id, companyId, dto);
    }
    deleteFolder(id, companyId) {
        return this.documentsService.deleteFolder(id, companyId);
    }
    createDocument(companyId, dto, uploaderId, file) {
        return this.documentsService.createDocument(companyId, uploaderId, dto, file);
    }
    listDocuments(companyId, query) {
        return this.documentsService.listDocuments(companyId, query);
    }
    getDocument(id, companyId) {
        return this.documentsService.getDocument(id, companyId);
    }
    getDownloadUrl(id, companyId) {
        return this.documentsService.getDownloadUrl(id, companyId);
    }
    updateDocument(id, companyId, dto) {
        return this.documentsService.updateDocument(id, companyId, dto);
    }
    uploadNewVersion(id, companyId, uploaderId, file) {
        return this.documentsService.uploadNewVersion(id, companyId, uploaderId, file);
    }
    deleteDocument(id, companyId) {
        return this.documentsService.deleteDocument(id, companyId);
    }
    addTags(id, companyId, dto) {
        return this.documentsService.addTags(id, companyId, dto);
    }
    removeTag(id, tag, companyId) {
        return this.documentsService.removeTag(id, companyId, tag);
    }
    downloadFile(path, res) {
        const key = Array.isArray(path) ? path.join('/') : path;
        const decodedKey = decodeURIComponent(key);
        if (!this.storageService.fileExists(decodedKey)) {
            throw new common_1.NotFoundException('File not found');
        }
        const fileBuffer = this.storageService.readFile(decodedKey);
        const fileName = decodedKey.split('/').pop() || 'download';
        const ext = fileName.split('.').pop()?.toLowerCase();
        const contentTypes = {
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
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Post)('companies/:companyId/folders'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new folder' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateFolderDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/folders'),
    (0, swagger_1.ApiOperation)({ summary: 'List all folders for a company' }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "listFolders", null);
__decorate([
    (0, common_1.Put)('folders/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a folder' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateFolderDto, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "updateFolder", null);
__decorate([
    (0, common_1.Delete)('folders/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a folder' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "deleteFolder", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/documents'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a new document' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __param(3, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }),
            new common_1.FileTypeValidator({
                fileType: /(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/,
            }),
        ],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateDocumentDto, String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "createDocument", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/documents'),
    (0, swagger_1.ApiOperation)({ summary: 'List documents with optional filters' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.ListDocumentsQueryDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Get)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get document details with versions' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "getDocument", null);
__decorate([
    (0, common_1.Get)('documents/:id/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Get presigned download URL' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "getDownloadUrl", null);
__decorate([
    (0, common_1.Put)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update document metadata' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateDocumentDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "updateDocument", null);
__decorate([
    (0, common_1.Post)('documents/:id/version'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a new version of a document' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __param(3, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }),
            new common_1.FileTypeValidator({
                fileType: /(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/,
            }),
        ],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "uploadNewVersion", null);
__decorate([
    (0, common_1.Delete)('documents/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a document' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Post)('documents/:id/tags'),
    (0, swagger_1.ApiOperation)({ summary: 'Add tags to a document' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.AddTagsDto]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "addTags", null);
__decorate([
    (0, common_1.Delete)('documents/:id/tags/:tag'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a tag from a document' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('tag')),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "removeTag", null);
__decorate([
    (0, decorators_2.Public)(),
    (0, common_1.Get)('documents/download/*path'),
    (0, swagger_1.ApiOperation)({ summary: 'Download a file directly from local storage' }),
    __param(0, (0, common_1.Param)('path')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "downloadFile", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService,
        storage_service_1.StorageService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map