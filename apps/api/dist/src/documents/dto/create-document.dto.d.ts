import { DocumentType } from '@prisma/client';
export declare class CreateDocumentDto {
    name: string;
    description?: string;
    type: DocumentType;
    folderId?: string;
    meetingId?: string;
}
export declare class UpdateDocumentDto {
    name?: string;
    description?: string;
    type?: DocumentType;
    folderId?: string;
}
export declare class AddTagsDto {
    tags: string[];
}
export declare class ListDocumentsQueryDto {
    type?: DocumentType;
    folderId?: string;
    tag?: string;
}
