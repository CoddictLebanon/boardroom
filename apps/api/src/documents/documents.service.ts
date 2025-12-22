import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import {
  CreateFolderDto,
  UpdateFolderDto,
  CreateDocumentDto,
  UpdateDocumentDto,
  AddTagsDto,
  ListDocumentsQueryDto,
} from './dto';
import { DocumentType } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  // ==========================================
  // FOLDERS
  // ==========================================

  async createFolder(companyId: string, dto: CreateFolderDto) {
    // Validate parent folder exists if provided
    if (dto.parentId) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: dto.parentId,
          companyId,
        },
      });

      if (!parentFolder) {
        throw new NotFoundException('Parent folder not found');
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
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });
  }

  async listFolders(companyId: string) {
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

  async updateFolder(id: string, companyId: string, dto: UpdateFolderDto) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, companyId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
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

  async deleteFolder(id: string, companyId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id, companyId },
      include: {
        documents: true,
        children: true,
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.documents.length > 0) {
      throw new BadRequestException(
        'Cannot delete folder with documents. Move or delete documents first.',
      );
    }

    if (folder.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete folder with subfolders. Delete subfolders first.',
      );
    }

    await this.prisma.folder.delete({ where: { id } });
    return { message: 'Folder deleted successfully' };
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================

  async createDocument(
    companyId: string,
    uploaderId: string,
    dto: CreateDocumentDto,
    file: Express.Multer.File,
  ) {
    // Validate folder if provided
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: dto.folderId,
          companyId,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    // Upload file to storage
    const storageKey = this.storageService.generateStorageKey(
      companyId,
      file.originalname,
    );
    await this.storageService.uploadFile(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    // Create document record and optionally link to meeting
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

      // If meetingId is provided, create the MeetingDocument link
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

    // Fetch the full document with relations
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

  async listDocuments(companyId: string, query: ListDocumentsQueryDto) {
    const where: any = { companyId };

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

  async getDocument(id: string, companyId: string) {
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
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDownloadUrl(id: string, companyId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const url = await this.storageService.getPresignedUrl(document.storageKey);
    return { url };
  }

  async updateDocument(
    id: string,
    companyId: string,
    dto: UpdateDocumentDto,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate folder if changing
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: dto.folderId,
          companyId,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
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

  async uploadNewVersion(
    id: string,
    companyId: string,
    uploaderId: string,
    file: Express.Multer.File,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Upload new file to storage
    const storageKey = this.storageService.generateStorageKey(
      companyId,
      file.originalname,
    );
    await this.storageService.uploadFile(
      storageKey,
      file.buffer,
      file.mimetype,
    );

    const newVersion = document.version + 1;

    // Create version record and update document
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

  async deleteDocument(id: string, companyId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
      include: {
        versions: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete all files from storage
    try {
      await this.storageService.deleteFile(document.storageKey);

      // Delete all version files
      for (const version of document.versions) {
        await this.storageService.deleteFile(version.storageKey);
      }
    } catch (error) {
      this.logger.error(`Failed to delete files from storage for document: ${id}`, error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete document record (cascade will delete versions and tags)
    await this.prisma.document.delete({ where: { id } });

    this.logger.log(`Document deleted: ${id}`);
    return { message: 'Document deleted successfully' };
  }

  // ==========================================
  // TAGS
  // ==========================================

  async addTags(id: string, companyId: string, dto: AddTagsDto) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get existing tags
    const existingTags = await this.prisma.documentTag.findMany({
      where: { documentId: id },
    });

    const existingTagNames = existingTags.map((t) => t.tag);
    const newTags = dto.tags.filter((tag) => !existingTagNames.includes(tag));

    // Create new tags
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

  async removeTag(id: string, companyId: string, tag: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const documentTag = await this.prisma.documentTag.findFirst({
      where: {
        documentId: id,
        tag,
      },
    });

    if (!documentTag) {
      throw new NotFoundException('Tag not found on document');
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
}
