# Resolutions Module

## Overview

The Resolutions module manages board resolutions with auto-numbering, status workflow, and category classification for compliance tracking.

## Database Schema

```prisma
model Resolution {
  id         String             @id @default(cuid())
  companyId  String
  number     String             // Auto-generated: RES-YYYY-NNN
  title      String
  content    String
  category   ResolutionCategory
  status     ResolutionStatus   @default(DRAFT)
  passedAt   DateTime?
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, number])
}

enum ResolutionStatus {
  DRAFT
  PROPOSED
  PASSED
  REJECTED
}

enum ResolutionCategory {
  GOVERNANCE
  FINANCIAL
  OPERATIONS
  LEGAL
  HR
  OTHER
}
```

## API Endpoints

### CRUD Operations

```
POST   /api/v1/companies/:companyId/resolutions
GET    /api/v1/companies/:companyId/resolutions
GET    /api/v1/companies/:companyId/resolutions/:id
PUT    /api/v1/companies/:companyId/resolutions/:id
DELETE /api/v1/companies/:companyId/resolutions/:id
```

### Get Next Number

```
GET /api/v1/companies/:companyId/resolutions/next-number
```

Returns the next available resolution number for the current year.

### Update Status

```
PUT /api/v1/companies/:companyId/resolutions/:id/status
```

**Request:**
```json
{
  "status": "PASSED"
}
```

## Auto-Numbering

Resolution numbers are automatically generated in the format:
```
RES-YYYY-NNN
```

Example: `RES-2025-001`, `RES-2025-002`

- Numbers reset each year
- Sequential within each company
- Unique per company-year combination

## Status Workflow

```
DRAFT → PROPOSED → PASSED
                 → REJECTED
```

**Business Rules:**
- New resolutions start as DRAFT
- DRAFT can be edited freely
- PROPOSED resolutions can still be edited
- PASSED and REJECTED resolutions cannot be edited
- PASSED and REJECTED resolutions cannot be deleted

## Query Parameters

| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status (DRAFT, PROPOSED, PASSED, REJECTED) |
| `category` | Filter by category |
| `year` | Filter by year (based on createdAt) |

## Example Requests

**Create Resolution:**
```json
{
  "title": "Approve Annual Budget",
  "content": "The Board hereby resolves to approve the annual budget for fiscal year 2025 with total expenditure of $1.5M.",
  "category": "FINANCIAL"
}
```

**Response:**
```json
{
  "id": "cmj...",
  "number": "RES-2025-001",
  "title": "Approve Annual Budget",
  "content": "...",
  "category": "FINANCIAL",
  "status": "DRAFT",
  "passedAt": null,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View resolutions | `resolutions.view` |
| Create resolution | `resolutions.create` |
| Update resolution | `resolutions.update` |
| Delete resolution | `resolutions.delete` |
| Change status | `resolutions.update` |

## Related Files

- Controller: `src/resolutions/resolutions.controller.ts`
- Service: `src/resolutions/resolutions.service.ts`
- DTOs: `src/resolutions/dto/`
