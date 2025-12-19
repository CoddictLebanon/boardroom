# Role Permissions System Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow company owners to customize permissions for existing roles (ADMIN, BOARD_MEMBER, OBSERVER) and create custom roles with configurable permissions.

**Architecture:** Permission-based access control with granular permissions per area. OWNER role always has full access (hardcoded bypass). Permissions stored per-company allowing different companies to have different configurations.

**Tech Stack:** Prisma for data model, NestJS guards/decorators for permission checks, React context for frontend permission state.

---

## Data Model

### New Tables

```prisma
// Available permissions in the system (seeded, not user-editable)
model Permission {
  id          String @id @default(cuid())
  code        String @unique // e.g., "meetings.view", "meetings.create"
  area        String // e.g., "meetings", "financials"
  action      String // e.g., "view", "create", "edit", "delete"
  description String // Human-readable description

  rolePermissions RolePermission[]
}

// Links roles to permissions per company
model RolePermission {
  id           String      @id @default(cuid())
  companyId    String
  role         MemberRole? // For system roles (ADMIN, BOARD_MEMBER, OBSERVER)
  customRoleId String?     // For custom roles
  permissionId String
  granted      Boolean     @default(false)

  company      Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customRole   CustomRole? @relation(fields: [customRoleId], references: [id], onDelete: Cascade)
  permission   Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([companyId, role, permissionId])
  @@unique([companyId, customRoleId, permissionId])
  @@index([companyId])
}

// Company-defined custom roles
model CustomRole {
  id          String   @id @default(cuid())
  companyId   String
  name        String   // e.g., "Auditor", "Secretary"
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  permissions RolePermission[]
  members     CompanyMember[]

  @@unique([companyId, name])
  @@index([companyId])
}
```

### Updates to Existing Tables

```prisma
model CompanyMember {
  // ... existing fields ...
  customRoleId String?    // New: for custom role assignment
  customRole   CustomRole? @relation(fields: [customRoleId], references: [id])
}

model Company {
  // ... existing fields ...
  rolePermissions RolePermission[]
  customRoles     CustomRole[]
}
```

---

## Permission Codes (28 total)

| Area | Permissions |
|------|-------------|
| Meetings | `meetings.view`, `meetings.create`, `meetings.edit`, `meetings.delete`, `meetings.start_live` |
| Action Items | `action_items.view`, `action_items.create`, `action_items.edit`, `action_items.delete`, `action_items.complete` |
| Resolutions | `resolutions.view`, `resolutions.create`, `resolutions.edit`, `resolutions.delete`, `resolutions.change_status` |
| Documents | `documents.view`, `documents.upload`, `documents.download`, `documents.delete` |
| Financials | `financials.view`, `financials.edit`, `financials.manage_pdfs` |
| Members | `members.view`, `members.invite`, `members.remove`, `members.change_roles` |
| Company | `company.view_settings`, `company.edit_settings` |

---

## Default Permissions by Role

| Permission Area | ADMIN | BOARD_MEMBER | OBSERVER |
|-----------------|-------|--------------|----------|
| *.view | Yes | Yes | Yes |
| *.create | Yes | Yes | No |
| *.edit | Yes | Yes | No |
| *.delete | Yes | No | No |
| *.complete (action items) | Yes | Yes | No |
| *.change_status (resolutions) | Yes | Yes | No |
| *.start_live (meetings) | Yes | Yes | No |
| *.upload/download (documents) | Yes | Yes | Yes (download only) |
| *.manage_pdfs (financials) | Yes | Yes | No |
| members.invite | Yes | No | No |
| members.remove | Yes | No | No |
| members.change_roles | No | No | No |
| company.edit_settings | Yes | No | No |

**Note:** OWNER always has full access (hardcoded, not stored in RolePermission).

---

## API Endpoints

### Permission Management (OWNER only)

```
GET    /companies/:companyId/permissions
       Returns: { systemRoles: { ADMIN: [...], BOARD_MEMBER: [...], OBSERVER: [...] }, customRoles: [...] }

PUT    /companies/:companyId/permissions
       Body: { role?: MemberRole, customRoleId?: string, permissions: { [code]: boolean } }
       Updates permissions for a specific role
```

### Custom Role Management (OWNER only)

```
GET    /companies/:companyId/custom-roles
       Returns: CustomRole[]

POST   /companies/:companyId/custom-roles
       Body: { name: string, description?: string }
       Returns: CustomRole

PUT    /custom-roles/:id
       Body: { name?: string, description?: string }
       Returns: CustomRole

DELETE /custom-roles/:id
       Returns: 204 No Content
```

### User Permissions (for frontend)

```
GET    /companies/:companyId/my-permissions
       Returns: { permissions: string[], role: MemberRole | null, customRole: CustomRole | null }
```

---

## Permission Checking

### Backend (NestJS)

```typescript
// Decorator for controllers
@RequirePermission('meetings.create')
@RequirePermission(['meetings.edit', 'meetings.delete']) // OR logic

// Guard implementation
@Injectable()
export class PermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    const { user, params } = context.switchToHttp().getRequest();

    return this.permissionService.hasAnyPermission(
      user.userId,
      params.companyId,
      requiredPermissions
    );
  }
}

// Permission service
@Injectable()
export class PermissionService {
  async hasPermission(userId: string, companyId: string, permission: string): Promise<boolean> {
    const membership = await this.getMembership(userId, companyId);
    if (!membership) return false;
    if (membership.role === 'OWNER') return true; // Bypass

    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        companyId,
        permissionId: { in: await this.getPermissionId(permission) },
        OR: [
          { role: membership.role },
          { customRoleId: membership.customRoleId }
        ]
      }
    });

    return rolePermission?.granted ?? false;
  }
}
```

### Frontend (React)

```typescript
// Permission context
const PermissionContext = createContext<{
  permissions: Set<string>;
  hasPermission: (code: string) => boolean;
  isLoading: boolean;
}>({ permissions: new Set(), hasPermission: () => false, isLoading: true });

// Hook
function usePermission(code: string): boolean {
  const { hasPermission } = useContext(PermissionContext);
  return hasPermission(code);
}

// Component usage
function MeetingsPage() {
  const canCreate = usePermission('meetings.create');
  const canDelete = usePermission('meetings.delete');

  return (
    <>
      {canCreate && <Button>New Meeting</Button>}
      {canDelete && <Button variant="destructive">Delete</Button>}
    </>
  );
}
```

---

## UI: Permission Management

**Location:** Company Settings > Permissions tab (visible to OWNER only)

**Layout:**
- Tabs for each role (Admin, Board Member, Observer, + Custom Roles)
- Collapsible sections for each permission area
- Checkboxes for each permission
- Save button with optimistic updates

**Custom Roles Panel:**
- List of custom roles with edit/delete buttons
- "Create Role" button opens modal
- Limit: 5 custom roles per company

---

## Migration Strategy

1. Create new tables (Permission, RolePermission, CustomRole)
2. Seed Permission table with 28 permission codes
3. On first access per company, create default RolePermission entries
4. Gradually add @RequirePermission decorators to existing endpoints
5. Update frontend to check permissions before showing UI elements

---

## Error Handling

- **403 Forbidden:** User lacks required permission
- **404 Not Found:** Custom role doesn't exist
- **400 Bad Request:** Invalid permission code, duplicate role name
- **409 Conflict:** Cannot delete role with assigned members
