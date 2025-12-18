import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { CreateFolderDto, UpdateFolderDto, CreateDocumentDto, UpdateDocumentDto, AddTagsDto, ListDocumentsQueryDto } from './dto';
export declare class DocumentsService {
    private readonly prisma;
    private readonly storageService;
    private readonly logger;
    constructor(prisma: PrismaService, storageService: StorageService);
    createFolder(companyId: string, dto: CreateFolderDto): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        parentId: string | null;
    }>;
    listFolders(companyId: string): Promise<({
        _count: {
            documents: number;
        };
        parent: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        parentId: string | null;
    })[]>;
    updateFolder(id: string, companyId: string, dto: UpdateFolderDto): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        companyId: string;
        parentId: string | null;
    }>;
    deleteFolder(id: string, companyId: string): Promise<{
        message: string;
    }>;
    createDocument(companyId: string, uploaderId: string, dto: CreateDocumentDto, file: Express.Multer.File): Promise<({
        folder: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        meetings: {
            id: string;
            createdAt: Date;
            meetingId: string;
            documentId: string;
            isPreRead: boolean;
        }[];
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
        uploader: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    }) | null>;
    listDocuments(companyId: string, query: ListDocumentsQueryDto): Promise<({
        folder: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        _count: {
            versions: number;
        };
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
        uploader: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    })[]>;
    getDocument(id: string, companyId: string): Promise<{
        folder: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
        uploader: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        versions: {
            id: string;
            createdAt: Date;
            documentId: string;
            uploaderId: string;
            size: number | null;
            storageKey: string;
            version: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    }>;
    getDownloadUrl(id: string, companyId: string): Promise<{
        url: string;
    }>;
    updateDocument(id: string, companyId: string, dto: UpdateDocumentDto): Promise<{
        folder: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
        uploader: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    }>;
    uploadNewVersion(id: string, companyId: string, uploaderId: string, file: Express.Multer.File): Promise<{
        folder: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            companyId: string;
            parentId: string | null;
        } | null;
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
        uploader: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        versions: {
            id: string;
            createdAt: Date;
            documentId: string;
            uploaderId: string;
            size: number | null;
            storageKey: string;
            version: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    }>;
    deleteDocument(id: string, companyId: string): Promise<{
        message: string;
    }>;
    addTags(id: string, companyId: string, dto: AddTagsDto): Promise<({
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    }) | null>;
    removeTag(id: string, companyId: string, tag: string): Promise<({
        tags: {
            id: string;
            documentId: string;
            tag: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        type: import("@prisma/client").$Enums.DocumentType;
        companyId: string;
        folderId: string | null;
        uploaderId: string;
        mimeType: string | null;
        size: number | null;
        storageKey: string;
        version: number;
    }) | null>;
}
