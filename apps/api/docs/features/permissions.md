# Permissions & Custom Roles Module

## Overview

The Permissions module provides granular role-based access control (RBAC) with both system roles and custom roles. Each company can configure permissions independently.

## Database Schema

```prisma
model Permission {
  id          String   @id @default(cuid())
  code        String   @unique  // e.g., "meetings.create"
  area        String              // e.g., "meetings"
  action      String              // e.g., "create"
  description String?

  rolePermissions RolePermission[]
}

model RolePermission {
  id           String      @id @default(cuid())
  companyId    String
  role         MemberRole? // For system roles
  customRoleId String?     // For custom roles
  permissionId String
  granted      Boolean     @default(false)

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customRole CustomRole? @relation(fields: [customRoleId], references: [id], onDelete: Cascade)
  permission Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([companyId, role, permissionId])
  @@unique([companyId, customRoleId, permissionId])
}

model CustomRole {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  members     CompanyMember[]
  permissions RolePermission[]

  @@unique([companyId, name])
}
```

## System Roles

| Role | Description |
|------|-------------|
| OWNER | Full access to everything. Bypasses all permission checks. |
| ADMIN | Administrative access with most permissions |
| BOARD_MEMBER | Standard board member access |
| OBSERVER | Read-only access |

## Available Permissions

### Meetings
- `meetings.view` - View meetings and details
- `meetings.create` - Create new meetings
- `meetings.update` - Edit meeting details
- `meetings.delete` - Delete/cancel meetings

### Documents
- `documents.view` - View and download documents
- `documents.create` - Upload new documents
- `documents.update` - Edit document metadata
- `documents.delete` - Delete documents

### Resolutions
- `resolutions.view` - View resolutions
- `resolutions.create` - Create new resolutions
- `resolutions.update` - Edit resolutions
- `resolutions.delete` - Delete resolutions
- `resolutions.vote` - Vote on resolutions

### Action Items
- `action-items.view` - View action items
- `action-items.create` - Create action items
- `action-items.update` - Edit action items
- `action-items.delete` - Delete action items

### Financials
- `financials.view` - View financial reports
- `financials.create` - Create financial reports
- `financials.update` - Edit financial reports
- `financials.delete` - Delete financial reports

### Members
- `members.view` - View company members
- `members.invite` - Invite new members

## API Endpoints

### Permissions Management (OWNER only)

```
GET /api/v1/companies/:companyId/permissions
PUT /api/v1/companies/:companyId/permissions
```

**Get Permissions Response:**
```json
{
  "allPermissions": [
    { "id": "...", "code": "meetings.view", "area": "meetings", "action": "view" }
  ],
  "systemRoles": {
    "ADMIN": { "meetings.view": true, "meetings.create": true },
    "BOARD_MEMBER": { "meetings.view": true, "meetings.create": false },
    "OBSERVER": { "meetings.view": true }
  },
  "customRoles": [
    {
      "id": "...",
      "name": "Committee Chair",
      "permissions": { "meetings.view": true, "meetings.create": true }
    }
  ]
}
```

**Update Permissions:**
```json
{
  "role": "BOARD_MEMBER",
  "permissions": {
    "meetings.create": true,
    "documents.delete": false
  }
}
```

### Current User's Permissions

```
GET /api/v1/companies/:companyId/my-permissions
```

Returns array of permission codes the current user has.

### Custom Roles (OWNER only)

```
GET    /api/v1/companies/:companyId/custom-roles
POST   /api/v1/companies/:companyId/custom-roles
PUT    /api/v1/custom-roles/:id
DELETE /api/v1/custom-roles/:id
```

**Create Custom Role:**
```json
{
  "name": "Committee Chair",
  "description": "Can manage committee meetings",
  "permissions": {
    "meetings.view": true,
    "meetings.create": true,
    "meetings.update": true
  }
}
```

## Default Permissions by Role

### ADMIN
All permissions except:
- Managing other owners
- Deleting the company

### BOARD_MEMBER
- View all content
- Create meetings, documents, action items
- Vote on resolutions
- Update own action items

### OBSERVER
- View only (all areas)

## Permission Check Flow

1. Check if user is OWNER → Grant access (bypass all checks)
2. Get user's role (system or custom)
3. Look up RolePermission for company + role + permission
4. Return granted status

## Related Files

- Permissions Controller: `src/permissions/permissions.controller.ts`
- Permissions Service: `src/permissions/permissions.service.ts`
- Permission Guard: `src/permissions/permission.guard.ts`
- Decorator: `src/permissions/require-permission.decorator.ts`
- Custom Roles Controller: `src/custom-roles/custom-roles.controller.ts`
- Custom Roles Service: `src/custom-roles/custom-roles.service.ts`
- Constants: `src/permissions/permissions.constants.ts`
