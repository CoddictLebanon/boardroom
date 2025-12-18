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
var DocumentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const storage_service_1 = require("./storage.service");
let DocumentsService = DocumentsService_1 = class DocumentsService {
    prisma;
    storageService;
    logger = new common_1.Logger(DocumentsService_1.name);
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async createFolder(companyId, dto) {
        if (dto.parentId) {
            const parentFolder = await this.prisma.folder.findFirst({
                where: {
                    id: dto.parentId,
                    companyId,
                },
            });
            if (!parentFolder) {
                throw new common_1.NotFoundException('Parent folder not found');
            }
        }
        return this.prisma.folder.create({
            data: {
                name: dto.name,
                companyId,
                parentId: dto.parentId,
            },
            include: {
                parent: true,
                children: true,
            },
        });
    }
    async listFolders(companyId) {
        return this.prisma.folder.findMany({
            where: { companyId },
            include: {
                parent: true,
                children: true,
                _count: {
                    select: {
                        documents: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    async updateFolder(id, companyId, dto) {
        const folder = await this.prisma.folder.findFirst({
            where: { id, companyId },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        return this.prisma.folder.update({
            where: { id },
            data: { name: dto.name },
            include: {
                parent: true,
                children: true,
            },
        });
    }
    async deleteFolder(id, companyId) {
        const folder = await this.prisma.folder.findFirst({
            where: { id, companyId },
            include: {
                documents: true,
                children: true,
            },
        });
        if (!folder) {
            throw new common_1.NotFoundException('Folder not found');
        }
        if (folder.documents.length > 0) {
            throw new common_1.BadRequestException('Cannot delete folder with documents. Move or delete documents first.');
        }
        if (folder.children.length > 0) {
            throw new common_1.BadRequestException('Cannot delete folder with subfolders. Delete subfolders first.');
        }
        await this.prisma.folder.delete({ where: { id } });
        return { message: 'Folder deleted successfully' };
    }
    async createDocument(companyId, uploaderId, dto, file) {
        if (dto.folderId) {
            const folder = await this.prisma.folder.findFirst({
                where: {
                    id: dto.folderId,
                    companyId,
                },
            });
            if (!folder) {
                throw new common_1.NotFoundException('Folder not found');
            }
        }
        const storageKey = this.storageService.generateStorageKey(companyId, file.originalname);
        await this.storageService.uploadFile(storageKey, file.buffer, file.mimetype);
        const document = await this.prisma.$transaction(async (tx) => {
            const newDocument = await tx.document.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    type: dto.type,
                    mimeType: file.mimetype,
                    size: file.size,
                    storageKey,
                    version: 1,
                    companyId,
                    uploaderId,
                    folderId: dto.folderId,
                },
            });
            if (dto.meetingId) {
                await tx.meetingDocument.create({
                    data: {
                        meetingId: dto.meetingId,
                        documentId: newDocument.id,
                        isPreRead: false,
                    },
                });
                this.logger.log(`Document ${newDocument.id} attached to meeting ${dto.meetingId}`);
            }
            return newDocument;
        });
        const fullDocument = await this.prisma.document.findUnique({
            where: { id: document.id },
            include: {
                folder: true,
                uploader: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                tags: true,
                meetings: dto.meetingId ? {
                    include: {
                        meeting: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                    },
                } : false,
            },
        });
        this.logger.log(`Document created: ${document.id}`);
        return fullDocument;
    }
    async listDocuments(companyId, query) {
        const where = { companyId };
        if (query.type) {
            where.type = query.type;
        }
        if (query.folderId) {
            where.folderId = query.folderId;
        }
        if (query.tag) {
            where.tags = {
                some: {
                    tag: query.tag,
                },
            };
        }
        return this.prisma.document.findMany({
            where,
            include: {
                folder: true,
                uploader: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                tags: true,
                _count: {
                    select: {
                        versions: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getDocument(id, companyId) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
            include: {
                folder: true,
                uploader: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                tags: true,
                versions: {
                    orderBy: {
                        version: 'desc',
                    },
                },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        return document;
    }
    async getDownloadUrl(id, companyId) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        const url = await this.storageService.getPresignedUrl(document.storageKey);
        return { url };
    }
    async updateDocument(id, companyId, dto) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        if (dto.folderId) {
            const folder = await this.prisma.folder.findFirst({
                where: {
                    id: dto.folderId,
                    companyId,
                },
            });
            if (!folder) {
                throw new common_1.NotFoundException('Folder not found');
            }
        }
        return this.prisma.document.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                type: dto.type,
                folderId: dto.folderId,
            },
            include: {
                folder: true,
                uploader: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                tags: true,
            },
        });
    }
    async uploadNewVersion(id, companyId, uploaderId, file) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        const storageKey = this.storageService.generateStorageKey(companyId, file.originalname);
        await this.storageService.uploadFile(storageKey, file.buffer, file.mimetype);
        const newVersion = document.version + 1;
        const [version, updatedDocument] = await this.prisma.$transaction([
            this.prisma.documentVersion.create({
                data: {
                    documentId: id,
                    version: newVersion,
                    storageKey,
                    size: file.size,
                    uploaderId,
                },
            }),
            this.prisma.document.update({
                where: { id },
                data: {
                    version: newVersion,
                    storageKey,
                    size: file.size,
                    mimeType: file.mimetype,
                },
                include: {
                    folder: true,
                    uploader: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    tags: true,
                    versions: {
                        orderBy: {
                            version: 'desc',
                        },
                    },
                },
            }),
        ]);
        this.logger.log(`New version uploaded for document: ${id}, version: ${newVersion}`);
        return updatedDocument;
    }
    async deleteDocument(id, companyId) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
            include: {
                versions: true,
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        try {
            await this.storageService.deleteFile(document.storageKey);
            for (const version of document.versions) {
                await this.storageService.deleteFile(version.storageKey);
            }
        }
        catch (error) {
            this.logger.error(`Failed to delete files from storage for document: ${id}`, error);
        }
        await this.prisma.document.delete({ where: { id } });
        this.logger.log(`Document deleted: ${id}`);
        return { message: 'Document deleted successfully' };
    }
    async addTags(id, companyId, dto) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        const existingTags = await this.prisma.documentTag.findMany({
            where: { documentId: id },
        });
        const existingTagNames = existingTags.map((t) => t.tag);
        const newTags = dto.tags.filter((tag) => !existingTagNames.includes(tag));
        if (newTags.length > 0) {
            await this.prisma.documentTag.createMany({
                data: newTags.map((tag) => ({
                    documentId: id,
                    tag,
                })),
            });
        }
        return this.prisma.document.findUnique({
            where: { id },
            include: {
                tags: true,
            },
        });
    }
    async removeTag(id, companyId, tag) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
        });
        if (!document) {
            throw new common_1.NotFoundException('Document not found');
        }
        const documentTag = await this.prisma.documentTag.findFirst({
            where: {
                documentId: id,
                tag,
            },
        });
        if (!documentTag) {
            throw new common_1.NotFoundException('Tag not found on document');
        }
        await this.prisma.documentTag.delete({
            where: { id: documentTag.id },
        });
        return this.prisma.document.findUnique({
            where: { id },
            include: {
                tags: true,
            },
        });
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = DocumentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map