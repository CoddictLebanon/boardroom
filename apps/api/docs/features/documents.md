# Documents Module

## Overview

The Documents module provides hierarchical document management with folder organization, version control, tagging, and secure file storage.

## Database Schema

```prisma
model Folder {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  parentId    String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company   Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  parent    Folder?    @relation("FolderHierarchy", fields: [parentId], references: [id])
  children  Folder[]   @relation("FolderHierarchy")
  documents Document[]
}

model Document {
  id          String       @id @default(cuid())
  companyId   String
  folderId    String?
  name        String
  description String?
  type        DocumentType @default(GENERAL)
  storageKey  String       // Path to file in storage
  size        Int          // bytes
  mimeType    String
  uploaderId  String
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  company  Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  folder   Folder?           @relation(fields: [folderId], references: [id])
  uploader User              @relation(fields: [uploaderId], references: [id])
  versions DocumentVersion[]
  tags     DocumentTag[]
}

model DocumentVersion {
  id         String   @id @default(cuid())
  documentId String
  version    Int
  storageKey String
  size       Int
  uploaderId String
  createdAt  DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  uploader User     @relation(fields: [uploaderId], references: [id])
}

model DocumentTag {
  id         String   @id @default(cuid())
  documentId String
  tag        String
  createdAt  DateTime @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, tag])
}

enum DocumentType {
  GENERAL
  MEETING
  FINANCIAL
  GOVERNANCE
}
```

## API Endpoints

### Folders

```
POST   /api/v1/companies/:companyId/folders
GET    /api/v1/companies/:companyId/folders
PUT    /api/v1/companies/:companyId/folders/:id
DELETE /api/v1/companies/:companyId/folders/:id
```

**Create Folder:**
```json
{
  "name": "Board Documents",
  "parentId": "optional-parent-folder-id",
  "description": "Official board documents"
}
```

### Documents

```
POST   /api/v1/companies/:companyId/documents
GET    /api/v1/companies/:companyId/documents
GET    /api/v1/companies/:companyId/documents/:id
GET    /api/v1/companies/:companyId/documents/:id/download
PUT    /api/v1/companies/:companyId/documents/:id
DELETE /api/v1/companies/:companyId/documents/:id
```

**Upload Document (multipart/form-data):**
```
POST /api/v1/companies/:companyId/documents
Content-Type: multipart/form-data

file: <binary>
name: "Q1 Financial Report"
type: "FINANCIAL"
folderId: "optional-folder-id"
description: "Quarterly financial summary"
```

**Query Parameters for List:**
- `type` - Filter by document type (GENERAL, MEETING, FINANCIAL, GOVERNANCE)
- `folderId` - Filter by folder

### Document Versions

```
POST /api/v1/companies/:companyId/documents/:id/version
```

Uploads a new version of an existing document. Version number auto-increments.

### Tags

```
POST   /api/v1/companies/:companyId/documents/:id/tags
DELETE /api/v1/companies/:companyId/documents/:id/tags/:tag
```

**Add Tags:**
```json
{
  "tags": ["important", "q1-2025", "reviewed"]
}
```

### File Download

```
GET /api/v1/documents/download/*path
```

Public endpoint for file downloads (path from storageKey).

## File Storage

- **Location:** `./uploads/` directory (local storage)
- **Max File Size:** 100MB
- **Allowed Types:** pdf, doc, docx, xls, xlsx, ppt, pptx, txt, jpg, jpeg, png, gif

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View documents | `documents.view` |
| Upload documents | `documents.create` |
| Update metadata | `documents.update` |
| Delete documents | `documents.delete` |
| Download files | `documents.view` |

## Related Files

- Controller: `src/documents/documents.controller.ts`
- Service: `src/documents/documents.service.ts`
- DTOs: `src/documents/dto/`
