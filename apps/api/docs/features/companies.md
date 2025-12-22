# Companies Module

## Overview

The Companies module is the core organizational unit of the application. It manages company creation, member management, and provides dashboard statistics.

## Database Schema

```prisma
model Company {
  id              String   @id @default(cuid())
  name            String
  logo            String?
  timezone        String   @default("UTC")
  fiscalYearStart Int      @default(1)  // Month 1-12
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  members           CompanyMember[]
  meetings          Meeting[]
  documents         Document[]
  folders           Folder[]
  resolutions       Resolution[]
  actionItems       ActionItem[]
  financialReports  FinancialReport[]
  monthlyFinancials MonthlyFinancial[]
  invitations       Invitation[]
  customRoles       CustomRole[]
  rolePermissions   RolePermission[]
}

model CompanyMember {
  id           String       @id @default(cuid())
  userId       String
  companyId    String
  role         MemberRole   @default(BOARD_MEMBER)
  customRoleId String?
  title        String?
  termStart    DateTime?
  termEnd      DateTime?
  status       MemberStatus @default(ACTIVE)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  // Relations
  user       User        @relation(fields: [userId], references: [id])
  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customRole CustomRole? @relation(fields: [customRoleId], references: [id])

  @@unique([userId, companyId])
}

enum MemberRole {
  OWNER
  ADMIN
  BOARD_MEMBER
  OBSERVER
}

enum MemberStatus {
  ACTIVE
  INACTIVE
  PENDING
}
```

## API Endpoints

### Create Company
```
POST /api/v1/companies
```

**Request Body:**
```json
{
  "name": "Company Name",
  "logo": "https://example.com/logo.png",
  "timezone": "Asia/Dubai",
  "fiscalYearStart": 1
}
```

**Business Rules:**
- Only users who are already OWNER of at least one company can create new companies
- Exception: First company in the system (bootstrap case) can be created by any authenticated user
- Creator is automatically assigned as OWNER
- Default permissions are initialized for the new company

### List User's Companies
```
GET /api/v1/companies
```

Returns all companies where the authenticated user is an ACTIVE member.

### Get Company Details
```
GET /api/v1/companies/:id
```

Returns company details including members and counts for meetings, documents, action items, and resolutions.

### Get Dashboard Statistics
```
GET /api/v1/companies/:id/dashboard
```

**Response:**
```json
{
  "stats": {
    "upcomingMeetings": 5,
    "openActionItems": 12,
    "pendingResolutions": 3,
    "boardMembers": 8
  },
  "upcomingMeetings": [...],
  "userActionItems": [...]
}
```

### Update Company
```
PUT /api/v1/companies/:id
```

**Required Role:** OWNER or ADMIN

### Add Member
```
POST /api/v1/companies/:id/members
```

**Required Role:** OWNER or ADMIN

**Request Body:**
```json
{
  "userId": "user_id",
  "role": "BOARD_MEMBER",
  "title": "CFO",
  "termStart": "2025-01-01",
  "termEnd": "2027-01-01"
}
```

### Update Member
```
PUT /api/v1/companies/:id/members/:memberId
```

**Required Role:** OWNER or ADMIN
- Only OWNER can modify other OWNERs
- Only OWNER can assign OWNER role

### Remove Member
```
DELETE /api/v1/companies/:id/members/:memberId
```

**Required Role:** OWNER or ADMIN
- Cannot remove the last OWNER
- Cannot remove yourself

## Permissions

| Action | OWNER | ADMIN | BOARD_MEMBER | OBSERVER |
|--------|-------|-------|--------------|----------|
| View company | ✓ | ✓ | ✓ | ✓ |
| Update company | ✓ | ✓ | ✗ | ✗ |
| Add members | ✓ | ✓ | ✗ | ✗ |
| Update members | ✓ | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✗ | ✗ |
| Delete company | ✓ | ✗ | ✗ | ✗ |

## Related Files

- Controller: `src/companies/companies.controller.ts`
- Service: `src/companies/companies.service.ts`
- DTOs: `src/companies/dto/`
- Module: `src/companies/companies.module.ts`
