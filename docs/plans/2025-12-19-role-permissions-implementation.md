# Role Permissions System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement configurable role-based permissions allowing company owners to customize what each role can do, plus support for custom roles.

**Architecture:** New Prisma models for Permission, RolePermission, and CustomRole. A PermissionService handles all permission checks. A @RequirePermission decorator protects API endpoints. Frontend uses a PermissionContext to conditionally render UI elements.

**Tech Stack:** Prisma, NestJS (guards, decorators, services), React Context, TypeScript

---

### Task 1: Add Prisma Schema for Permissions

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add Permission model**

Add after the existing models in schema.prisma:

```prisma
// Available permissions in the system (seeded data)
model Permission {
  id          String @id @default(cuid())
  code        String @unique // e.g., "meetings.view"
  area        String // e.g., "meetings"
  action      String // e.g., "view"
  description String

  rolePermissions RolePermission[]
}
```

**Step 2: Add CustomRole model**

```prisma
// Company-defined custom roles
model CustomRole {
  id          String   @id @default(cuid())
  companyId   String
  name        String
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

**Step 3: Add RolePermission model**

```prisma
// Links roles to permissions per company
model RolePermission {
  id           String      @id @default(cuid())
  companyId    String
  role         MemberRole? // For system roles (ADMIN, BOARD_MEMBER, OBSERVER)
  customRoleId String?
  permissionId String
  granted      Boolean     @default(false)

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customRole CustomRole? @relation(fields: [customRoleId], references: [id], onDelete: Cascade)
  permission Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([companyId, role, permissionId])
  @@unique([companyId, customRoleId, permissionId])
  @@index([companyId])
}
```

**Step 4: Update CompanyMember model**

Find the CompanyMember model and add customRoleId field:

```prisma
model CompanyMember {
  // ... existing fields ...
  customRoleId String?
  customRole   CustomRole? @relation(fields: [customRoleId], references: [id])
  // ... rest of model ...
}
```

**Step 5: Update Company model relations**

Add to Company model:

```prisma
  rolePermissions RolePermission[]
  customRoles     CustomRole[]
```

**Step 6: Run migration**

```bash
cd apps/api && npx prisma migrate dev --name add_permissions_system
```

**Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add Prisma schema for permissions system"
```

---

### Task 2: Create Permission Seed Data

**Files:**
- Create: `apps/api/prisma/seeds/permissions.ts`
- Modify: `apps/api/prisma/seed.ts` (if exists) or create it

**Step 1: Create permissions seed file**

```typescript
// apps/api/prisma/seeds/permissions.ts
import { PrismaClient } from '@prisma/client';

export const PERMISSIONS = [
  // Meetings
  { code: 'meetings.view', area: 'meetings', action: 'view', description: 'View meetings' },
  { code: 'meetings.create', area: 'meetings', action: 'create', description: 'Create meetings' },
  { code: 'meetings.edit', area: 'meetings', action: 'edit', description: 'Edit meetings' },
  { code: 'meetings.delete', area: 'meetings', action: 'delete', description: 'Delete meetings' },
  { code: 'meetings.start_live', area: 'meetings', action: 'start_live', description: 'Start live meeting sessions' },

  // Action Items
  { code: 'action_items.view', area: 'action_items', action: 'view', description: 'View action items' },
  { code: 'action_items.create', area: 'action_items', action: 'create', description: 'Create action items' },
  { code: 'action_items.edit', area: 'action_items', action: 'edit', description: 'Edit action items' },
  { code: 'action_items.delete', area: 'action_items', action: 'delete', description: 'Delete action items' },
  { code: 'action_items.complete', area: 'action_items', action: 'complete', description: 'Mark action items complete' },

  // Resolutions
  { code: 'resolutions.view', area: 'resolutions', action: 'view', description: 'View resolutions' },
  { code: 'resolutions.create', area: 'resolutions', action: 'create', description: 'Create resolutions' },
  { code: 'resolutions.edit', area: 'resolutions', action: 'edit', description: 'Edit resolutions' },
  { code: 'resolutions.delete', area: 'resolutions', action: 'delete', description: 'Delete resolutions' },
  { code: 'resolutions.change_status', area: 'resolutions', action: 'change_status', description: 'Change resolution status' },

  // Documents
  { code: 'documents.view', area: 'documents', action: 'view', description: 'View documents' },
  { code: 'documents.upload', area: 'documents', action: 'upload', description: 'Upload documents' },
  { code: 'documents.download', area: 'documents', action: 'download', description: 'Download documents' },
  { code: 'documents.delete', area: 'documents', action: 'delete', description: 'Delete documents' },

  // Financials
  { code: 'financials.view', area: 'financials', action: 'view', description: 'View financial data' },
  { code: 'financials.edit', area: 'financials', action: 'edit', description: 'Edit financial data' },
  { code: 'financials.manage_pdfs', area: 'financials', action: 'manage_pdfs', description: 'Upload/delete financial PDFs' },

  // Members
  { code: 'members.view', area: 'members', action: 'view', description: 'View company members' },
  { code: 'members.invite', area: 'members', action: 'invite', description: 'Invite new members' },
  { code: 'members.remove', area: 'members', action: 'remove', description: 'Remove members' },
  { code: 'members.change_roles', area: 'members', action: 'change_roles', description: 'Change member roles' },

  // Company
  { code: 'company.view_settings', area: 'company', action: 'view_settings', description: 'View company settings' },
  { code: 'company.edit_settings', area: 'company', action: 'edit_settings', description: 'Edit company settings' },
];

export async function seedPermissions(prisma: PrismaClient) {
  console.log('Seeding permissions...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  console.log(`Seeded ${PERMISSIONS.length} permissions`);
}
```

**Step 2: Create or update seed.ts**

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seeds/permissions';

const prisma = new PrismaClient();

async function main() {
  await seedPermissions(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Step 3: Add seed script to package.json**

In `apps/api/package.json`, add to scripts:

```json
"prisma:seed": "ts-node prisma/seed.ts"
```

**Step 4: Run seed**

```bash
cd apps/api && npm run prisma:seed
```

**Step 5: Commit**

```bash
git add apps/api/prisma/seeds/ apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat: add permission seed data (28 permissions)"
```

---

### Task 3: Create Permission Service

**Files:**
- Create: `apps/api/src/permissions/permissions.module.ts`
- Create: `apps/api/src/permissions/permissions.service.ts`
- Create: `apps/api/src/permissions/permissions.constants.ts`

**Step 1: Create permissions constants**

```typescript
// apps/api/src/permissions/permissions.constants.ts
import { MemberRole } from '@prisma/client';

// Default permissions for system roles when a company is created
export const DEFAULT_ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  OWNER: [], // OWNER bypasses all checks, doesn't need explicit permissions

  ADMIN: [
    // Full access except members.change_roles
    'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.delete', 'meetings.start_live',
    'action_items.view', 'action_items.create', 'action_items.edit', 'action_items.delete', 'action_items.complete',
    'resolutions.view', 'resolutions.create', 'resolutions.edit', 'resolutions.delete', 'resolutions.change_status',
    'documents.view', 'documents.upload', 'documents.download', 'documents.delete',
    'financials.view', 'financials.edit', 'financials.manage_pdfs',
    'members.view', 'members.invite', 'members.remove',
    'company.view_settings', 'company.edit_settings',
  ],

  BOARD_MEMBER: [
    // Can view and create/edit, but not delete or manage members
    'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.start_live',
    'action_items.view', 'action_items.create', 'action_items.edit', 'action_items.complete',
    'resolutions.view', 'resolutions.create', 'resolutions.edit', 'resolutions.change_status',
    'documents.view', 'documents.upload', 'documents.download',
    'financials.view', 'financials.edit', 'financials.manage_pdfs',
    'members.view',
    'company.view_settings',
  ],

  OBSERVER: [
    // View-only access
    'meetings.view',
    'action_items.view',
    'resolutions.view',
    'documents.view', 'documents.download',
    'financials.view',
    'members.view',
    'company.view_settings',
  ],
};
```

**Step 2: Create permissions service**

```typescript
// apps/api/src/permissions/permissions.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions.constants';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission in a company
   */
  async hasPermission(
    userId: string,
    companyId: string,
    permissionCode: string,
  ): Promise<boolean> {
    // Get user's membership
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
      include: { customRole: true },
    });

    if (!membership) return false;

    // OWNER always has full access
    if (membership.role === MemberRole.OWNER) return true;

    // Check permission
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });

    if (!permission) return false;

    // Check RolePermission
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        companyId,
        permissionId: permission.id,
        OR: [
          { role: membership.role, customRoleId: null },
          { customRoleId: membership.customRoleId },
        ],
      },
    });

    return rolePermission?.granted ?? false;
  }

  /**
   * Check if user has any of the given permissions
   */
  async hasAnyPermission(
    userId: string,
    companyId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    for (const code of permissionCodes) {
      if (await this.hasPermission(userId, companyId, code)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all permissions for a user in a company
   */
  async getUserPermissions(userId: string, companyId: string): Promise<string[]> {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership) return [];

    // OWNER gets all permissions
    if (membership.role === MemberRole.OWNER) {
      const allPermissions = await this.prisma.permission.findMany();
      return allPermissions.map((p) => p.code);
    }

    // Get granted permissions
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        companyId,
        granted: true,
        OR: [
          { role: membership.role, customRoleId: null },
          { customRoleId: membership.customRoleId },
        ],
      },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission.code);
  }

  /**
   * Initialize default permissions for a new company
   */
  async initializeCompanyPermissions(companyId: string): Promise<void> {
    const permissions = await this.prisma.permission.findMany();
    const permissionMap = new Map(permissions.map((p) => [p.code, p.id]));

    // Create RolePermission entries for each system role
    for (const role of [MemberRole.ADMIN, MemberRole.BOARD_MEMBER, MemberRole.OBSERVER]) {
      const grantedCodes = DEFAULT_ROLE_PERMISSIONS[role];

      for (const permission of permissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            companyId_role_permissionId: {
              companyId,
              role,
              permissionId: permission.id,
            },
          },
          create: {
            companyId,
            role,
            permissionId: permission.id,
            granted: grantedCodes.includes(permission.code),
          },
          update: {},
        });
      }
    }
  }

  /**
   * Get all permissions grouped by role for a company
   */
  async getCompanyPermissions(companyId: string) {
    // Ensure permissions are initialized
    const existingCount = await this.prisma.rolePermission.count({
      where: { companyId, role: { not: null } },
    });

    if (existingCount === 0) {
      await this.initializeCompanyPermissions(companyId);
    }

    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ area: 'asc' }, { action: 'asc' }],
    });

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { companyId },
      include: { permission: true, customRole: true },
    });

    // Group by role
    const result: Record<string, Record<string, boolean>> = {
      ADMIN: {},
      BOARD_MEMBER: {},
      OBSERVER: {},
    };

    for (const rp of rolePermissions) {
      if (rp.role && !rp.customRoleId) {
        result[rp.role][rp.permission.code] = rp.granted;
      }
    }

    // Get custom roles
    const customRoles = await this.prisma.customRole.findMany({
      where: { companyId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    const customRolesPermissions = customRoles.map((cr) => ({
      id: cr.id,
      name: cr.name,
      description: cr.description,
      permissions: Object.fromEntries(
        cr.permissions.map((rp) => [rp.permission.code, rp.granted]),
      ),
    }));

    return {
      allPermissions,
      systemRoles: result,
      customRoles: customRolesPermissions,
    };
  }

  /**
   * Update permissions for a role
   */
  async updateRolePermissions(
    companyId: string,
    role: MemberRole | null,
    customRoleId: string | null,
    permissions: Record<string, boolean>,
  ): Promise<void> {
    const allPermissions = await this.prisma.permission.findMany();
    const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

    for (const [code, granted] of Object.entries(permissions)) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;

      if (role && !customRoleId) {
        await this.prisma.rolePermission.upsert({
          where: {
            companyId_role_permissionId: { companyId, role, permissionId },
          },
          create: { companyId, role, permissionId, granted },
          update: { granted },
        });
      } else if (customRoleId) {
        await this.prisma.rolePermission.upsert({
          where: {
            companyId_customRoleId_permissionId: { companyId, customRoleId, permissionId },
          },
          create: { companyId, customRoleId, permissionId, granted },
          update: { granted },
        });
      }
    }
  }

  /**
   * Verify user is OWNER of company
   */
  async verifyOwner(userId: string, companyId: string): Promise<void> {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only company owner can manage permissions');
    }
  }
}
```

**Step 3: Create permissions module**

```typescript
// apps/api/src/permissions/permissions.module.ts
import { Module, Global } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
```

**Step 4: Add to app.module.ts**

In `apps/api/src/app.module.ts`, import and add PermissionsModule:

```typescript
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    // ... existing imports
    PermissionsModule,
  ],
})
export class AppModule {}
```

**Step 5: Commit**

```bash
git add apps/api/src/permissions/ apps/api/src/app.module.ts
git commit -m "feat: add PermissionsService with permission checking logic"
```

---

### Task 4: Create Permission Guard and Decorator

**Files:**
- Create: `apps/api/src/permissions/require-permission.decorator.ts`
- Create: `apps/api/src/permissions/permission.guard.ts`

**Step 1: Create decorator**

```typescript
// apps/api/src/permissions/require-permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for an endpoint
 * @param permissions - Single permission code or array of codes (OR logic)
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

**Step 2: Create guard**

```typescript
// apps/api/src/permissions/permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { PERMISSIONS_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const companyId = request.params?.companyId;

    if (!userId || !companyId) {
      throw new ForbiddenException('Missing user or company context');
    }

    const hasPermission = await this.permissionsService.hasAnyPermission(
      userId,
      companyId,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermissions.join(' or ')}`,
      );
    }

    return true;
  }
}
```

**Step 3: Export from module**

Update `apps/api/src/permissions/permissions.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionGuard } from './permission.guard';

@Global()
@Module({
  providers: [PermissionsService, PermissionGuard],
  exports: [PermissionsService, PermissionGuard],
})
export class PermissionsModule {}
```

**Step 4: Create index.ts for clean exports**

```typescript
// apps/api/src/permissions/index.ts
export * from './permissions.module';
export * from './permissions.service';
export * from './permissions.constants';
export * from './permission.guard';
export * from './require-permission.decorator';
```

**Step 5: Commit**

```bash
git add apps/api/src/permissions/
git commit -m "feat: add RequirePermission decorator and PermissionGuard"
```

---

### Task 5: Create Permissions API Controller

**Files:**
- Create: `apps/api/src/permissions/permissions.controller.ts`
- Create: `apps/api/src/permissions/dto/update-permissions.dto.ts`

**Step 1: Create DTO**

```typescript
// apps/api/src/permissions/dto/update-permissions.dto.ts
import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdatePermissionsDto {
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  @IsOptional()
  @IsString()
  customRoleId?: string;

  @IsObject()
  permissions: Record<string, boolean>;
}
```

**Step 2: Create controller**

```typescript
// apps/api/src/permissions/permissions.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { PermissionsService } from './permissions.service';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@Controller()
@UseGuards(ClerkAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Get all permissions for a company (for management UI)
   */
  @Get('companies/:companyId/permissions')
  async getCompanyPermissions(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.permissionsService.verifyOwner(userId, companyId);
    return this.permissionsService.getCompanyPermissions(companyId);
  }

  /**
   * Update permissions for a role
   */
  @Put('companies/:companyId/permissions')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updatePermissions(
    @Param('companyId') companyId: string,
    @Body() dto: UpdatePermissionsDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.permissionsService.verifyOwner(userId, companyId);

    await this.permissionsService.updateRolePermissions(
      companyId,
      dto.role || null,
      dto.customRoleId || null,
      dto.permissions,
    );

    return { success: true };
  }

  /**
   * Get current user's permissions (for frontend)
   */
  @Get('companies/:companyId/my-permissions')
  async getMyPermissions(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const permissions = await this.permissionsService.getUserPermissions(
      userId,
      companyId,
    );
    return { permissions };
  }
}
```

**Step 3: Add controller to module**

Update `apps/api/src/permissions/permissions.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionGuard } from './permission.guard';
import { PermissionsController } from './permissions.controller';

@Global()
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionGuard],
  exports: [PermissionsService, PermissionGuard],
})
export class PermissionsModule {}
```

**Step 4: Commit**

```bash
git add apps/api/src/permissions/
git commit -m "feat: add Permissions API controller with endpoints"
```

---

### Task 6: Create Custom Roles API

**Files:**
- Create: `apps/api/src/custom-roles/custom-roles.module.ts`
- Create: `apps/api/src/custom-roles/custom-roles.service.ts`
- Create: `apps/api/src/custom-roles/custom-roles.controller.ts`
- Create: `apps/api/src/custom-roles/dto/create-custom-role.dto.ts`
- Create: `apps/api/src/custom-roles/dto/update-custom-role.dto.ts`

**Step 1: Create DTOs**

```typescript
// apps/api/src/custom-roles/dto/create-custom-role.dto.ts
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCustomRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
```

```typescript
// apps/api/src/custom-roles/dto/update-custom-role.dto.ts
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdateCustomRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
```

**Step 2: Create service**

```typescript
// apps/api/src/custom-roles/custom-roles.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';

const MAX_CUSTOM_ROLES = 5;

@Injectable()
export class CustomRolesService {
  constructor(private prisma: PrismaService) {}

  async verifyOwner(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only company owner can manage custom roles');
    }
  }

  async findAll(companyId: string) {
    return this.prisma.customRole.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async create(companyId: string, dto: CreateCustomRoleDto) {
    // Check limit
    const count = await this.prisma.customRole.count({ where: { companyId } });
    if (count >= MAX_CUSTOM_ROLES) {
      throw new BadRequestException(
        `Maximum of ${MAX_CUSTOM_ROLES} custom roles allowed per company`,
      );
    }

    // Check for duplicate name
    const existing = await this.prisma.customRole.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    return this.prisma.customRole.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateCustomRoleDto) {
    const role = await this.prisma.customRole.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Custom role not found');
    }

    // Check for duplicate name if changing
    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.customRole.findFirst({
        where: { companyId: role.companyId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    return this.prisma.customRole.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!role) {
      throw new NotFoundException('Custom role not found');
    }

    if (role.members.length > 0) {
      throw new ConflictException(
        'Cannot delete role with assigned members. Reassign members first.',
      );
    }

    await this.prisma.customRole.delete({ where: { id } });
  }

  async getCompanyIdForRole(roleId: string): Promise<string> {
    const role = await this.prisma.customRole.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException('Custom role not found');
    }
    return role.companyId;
  }
}
```

**Step 3: Create controller**

```typescript
// apps/api/src/custom-roles/custom-roles.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { CustomRolesService } from './custom-roles.service';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';

@Controller()
@UseGuards(ClerkAuthGuard)
export class CustomRolesController {
  constructor(private readonly customRolesService: CustomRolesService) {}

  @Get('companies/:companyId/custom-roles')
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.customRolesService.verifyOwner(userId, companyId);
    return this.customRolesService.findAll(companyId);
  }

  @Post('companies/:companyId/custom-roles')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCustomRoleDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.customRolesService.verifyOwner(userId, companyId);
    return this.customRolesService.create(companyId, dto);
  }

  @Put('custom-roles/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomRoleDto,
    @CurrentUser('userId') userId: string,
  ) {
    const companyId = await this.customRolesService.getCompanyIdForRole(id);
    await this.customRolesService.verifyOwner(userId, companyId);
    return this.customRolesService.update(id, dto);
  }

  @Delete('custom-roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const companyId = await this.customRolesService.getCompanyIdForRole(id);
    await this.customRolesService.verifyOwner(userId, companyId);
    await this.customRolesService.remove(id);
  }
}
```

**Step 4: Create module**

```typescript
// apps/api/src/custom-roles/custom-roles.module.ts
import { Module } from '@nestjs/common';
import { CustomRolesService } from './custom-roles.service';
import { CustomRolesController } from './custom-roles.controller';

@Module({
  controllers: [CustomRolesController],
  providers: [CustomRolesService],
  exports: [CustomRolesService],
})
export class CustomRolesModule {}
```

**Step 5: Add to app.module.ts**

```typescript
import { CustomRolesModule } from './custom-roles/custom-roles.module';

@Module({
  imports: [
    // ... existing
    CustomRolesModule,
  ],
})
```

**Step 6: Commit**

```bash
git add apps/api/src/custom-roles/ apps/api/src/app.module.ts
git commit -m "feat: add Custom Roles API with CRUD endpoints"
```

---

### Task 7: Initialize Permissions on Company Creation

**Files:**
- Modify: `apps/api/src/companies/companies.service.ts`

**Step 1: Inject PermissionsService**

Add to constructor:

```typescript
import { PermissionsService } from '../permissions/permissions.service';

constructor(
  private prisma: PrismaService,
  private permissionsService: PermissionsService, // Add this
) {}
```

**Step 2: Call initializeCompanyPermissions after company creation**

In the `create` method, after creating the company and owner membership, add:

```typescript
// Initialize default permissions for the new company
await this.permissionsService.initializeCompanyPermissions(company.id);
```

**Step 3: Commit**

```bash
git add apps/api/src/companies/companies.service.ts
git commit -m "feat: initialize permissions when creating new company"
```

---

### Task 8: Create Frontend Permission Context

**Files:**
- Create: `apps/web/lib/permissions/permission-context.tsx`
- Create: `apps/web/lib/permissions/index.ts`

**Step 1: Create permission context**

```typescript
// apps/web/lib/permissions/permission-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

interface PermissionContextType {
  permissions: Set<string>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: new Set(),
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isLoading: true,
  refresh: async () => {},
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface PermissionProviderProps {
  companyId: string;
  children: React.ReactNode;
}

export function PermissionProvider({ companyId, children }: PermissionProviderProps) {
  const { getToken, isSignedIn } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!isSignedIn || !companyId) {
      setPermissions(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/my-permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(new Set(data.permissions));
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, getToken, isSignedIn]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code: string) => permissions.has(code),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((code) => permissions.has(code)),
    [permissions]
  );

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        hasPermission,
        hasAnyPermission,
        isLoading,
        refresh: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}

export function usePermission(code: string): boolean {
  const { hasPermission, isLoading } = usePermissions();
  // Return false while loading to prevent flash of unauthorized content
  if (isLoading) return false;
  return hasPermission(code);
}
```

**Step 2: Create index export**

```typescript
// apps/web/lib/permissions/index.ts
export * from "./permission-context";
```

**Step 3: Add PermissionProvider to company layout**

Update `apps/web/app/companies/[companyId]/layout-client.tsx`:

```typescript
"use client";

import { SocketProvider } from "@/lib/socket";
import { PermissionProvider } from "@/lib/permissions";

interface CompanyLayoutClientProps {
  companyId: string;
  children: React.ReactNode;
}

export function CompanyLayoutClient({ companyId, children }: CompanyLayoutClientProps) {
  return (
    <SocketProvider>
      <PermissionProvider companyId={companyId}>
        {children}
      </PermissionProvider>
    </SocketProvider>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/lib/permissions/ apps/web/app/companies/\[companyId\]/layout-client.tsx
git commit -m "feat: add frontend PermissionContext for permission checking"
```

---

### Task 9: Create Permissions Management UI

**Files:**
- Create: `apps/web/app/companies/[companyId]/settings/permissions/page.tsx`

**Step 1: Create permissions management page**

```typescript
// apps/web/app/companies/[companyId]/settings/permissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Shield } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Permission {
  id: string;
  code: string;
  area: string;
  action: string;
  description: string;
}

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
}

interface PermissionsData {
  allPermissions: Permission[];
  systemRoles: Record<string, Record<string, boolean>>;
  customRoles: CustomRole[];
}

const AREA_LABELS: Record<string, string> = {
  meetings: "Meetings",
  action_items: "Action Items",
  resolutions: "Resolutions",
  documents: "Documents",
  financials: "Financials",
  members: "Members",
  company: "Company",
};

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  complete: "Complete",
  start_live: "Start Live",
  change_status: "Change Status",
  upload: "Upload",
  download: "Download",
  manage_pdfs: "Manage PDFs",
  invite: "Invite",
  remove: "Remove",
  change_roles: "Change Roles",
  view_settings: "View Settings",
  edit_settings: "Edit Settings",
};

export default function PermissionsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const companyId = params.companyId as string;

  const [data, setData] = useState<PermissionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("ADMIN");
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, boolean>>>({});

  // Custom role dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await fetch(`${API_URL}/companies/${companyId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const permData = await response.json();
        setData(permData);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [companyId]);

  const getPermissionValue = (roleKey: string, permCode: string): boolean => {
    // Check pending changes first
    if (pendingChanges[roleKey]?.[permCode] !== undefined) {
      return pendingChanges[roleKey][permCode];
    }

    // Then check actual data
    if (!data) return false;

    if (["ADMIN", "BOARD_MEMBER", "OBSERVER"].includes(roleKey)) {
      return data.systemRoles[roleKey]?.[permCode] ?? false;
    } else {
      const customRole = data.customRoles.find((r) => r.id === roleKey);
      return customRole?.permissions[permCode] ?? false;
    }
  };

  const handlePermissionChange = (roleKey: string, permCode: string, value: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [roleKey]: {
        ...(prev[roleKey] || {}),
        [permCode]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    try {
      setIsSaving(true);
      const token = await getToken();

      for (const [roleKey, permissions] of Object.entries(pendingChanges)) {
        const isSystemRole = ["ADMIN", "BOARD_MEMBER", "OBSERVER"].includes(roleKey);

        await fetch(`${API_URL}/companies/${companyId}/permissions`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: isSystemRole ? roleKey : undefined,
            customRoleId: isSystemRole ? undefined : roleKey,
            permissions,
          }),
        });
      }

      setPendingChanges({});
      await fetchPermissions();
    } catch (error) {
      console.error("Error saving permissions:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      setIsCreating(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/companies/${companyId}/custom-roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setNewRoleName("");
        setNewRoleDescription("");
        await fetchPermissions();
      }
    } catch (error) {
      console.error("Error creating role:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const token = await getToken();
      await fetch(`${API_URL}/custom-roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchPermissions();
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  // Group permissions by area
  const permissionsByArea = data?.allPermissions.reduce((acc, perm) => {
    if (!acc[perm.area]) acc[perm.area] = [];
    acc[perm.area].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const allTabs = [
    { key: "ADMIN", label: "Admin" },
    { key: "BOARD_MEMBER", label: "Board Member" },
    { key: "OBSERVER", label: "Observer" },
    ...(data?.customRoles.map((r) => ({ key: r.id, label: r.name })) || []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Permissions</h1>
          <p className="text-muted-foreground">
            Configure what each role can do in your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Custom Role
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Permission Settings</CardTitle>
              <CardDescription>
                Owner always has full access. Configure permissions for other roles below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {allTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {allTabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key}>
                {/* Delete button for custom roles */}
                {!["ADMIN", "BOARD_MEMBER", "OBSERVER"].includes(tab.key) && (
                  <div className="mb-4 flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteRole(tab.key)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Role
                    </Button>
                  </div>
                )}

                <div className="space-y-6">
                  {Object.entries(permissionsByArea).map(([area, permissions]) => (
                    <div key={area} className="space-y-3">
                      <h3 className="font-semibold text-lg">
                        {AREA_LABELS[area] || area}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {permissions.map((perm) => (
                          <div key={perm.code} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${tab.key}-${perm.code}`}
                              checked={getPermissionValue(tab.key, perm.code)}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(tab.key, perm.code, !!checked)
                              }
                            />
                            <label
                              htmlFor={`${tab.key}-${perm.code}`}
                              className="text-sm cursor-pointer"
                            >
                              {ACTION_LABELS[perm.action] || perm.action}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Custom Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new role with custom permissions. You can configure permissions after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., Auditor, Secretary"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Description (optional)</Label>
              <Textarea
                id="role-description"
                placeholder="Brief description of this role..."
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={isCreating || !newRoleName.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Add link in settings sidebar/navigation**

Update the settings page or sidebar to include a link to `/companies/[companyId]/settings/permissions`.

**Step 3: Commit**

```bash
git add apps/web/app/companies/\[companyId\]/settings/permissions/
git commit -m "feat: add Permissions management UI page"
```

---

### Task 10: Add Permission Checks to Existing Controllers

**Files:**
- Modify: `apps/api/src/meetings/meetings.controller.ts`
- Modify: `apps/api/src/action-items/action-items.controller.ts`
- Modify: `apps/api/src/resolutions/resolutions.controller.ts`
- Modify: `apps/api/src/documents/documents.controller.ts`
- Modify: `apps/api/src/monthly-financials/monthly-financials.controller.ts`

**Step 1: Add guards to meetings controller**

Add imports and decorators:

```typescript
import { UseGuards } from '@nestjs/common';
import { PermissionGuard, RequirePermission } from '../permissions';

// Add @UseGuards(PermissionGuard) after @UseGuards(ClerkAuthGuard)
// Add @RequirePermission decorators to each endpoint:

@Get('companies/:companyId/meetings')
@RequirePermission('meetings.view')
async findAll(...) { }

@Post('companies/:companyId/meetings')
@RequirePermission('meetings.create')
async create(...) { }

@Put('meetings/:id')
@RequirePermission('meetings.edit')
async update(...) { }

@Delete('meetings/:id')
@RequirePermission('meetings.delete')
async remove(...) { }
```

**Step 2: Repeat for other controllers**

Apply the same pattern to:
- action-items.controller.ts
- resolutions.controller.ts
- documents.controller.ts
- monthly-financials.controller.ts

Using appropriate permission codes for each endpoint.

**Step 3: Commit**

```bash
git add apps/api/src/meetings/ apps/api/src/action-items/ apps/api/src/resolutions/ apps/api/src/documents/ apps/api/src/monthly-financials/
git commit -m "feat: add RequirePermission decorators to all controllers"
```

---

### Task 11: Add Permission Checks to Frontend UI

**Files:**
- Modify: Various page components

**Step 1: Update pages to use permission checks**

Example for meetings page:

```typescript
import { usePermission } from "@/lib/permissions";

function MeetingsPage() {
  const canCreate = usePermission('meetings.create');
  const canDelete = usePermission('meetings.delete');

  return (
    <>
      {canCreate && (
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Meeting
        </Button>
      )}

      {/* In the list, conditionally show delete button */}
      {canDelete && (
        <Button variant="destructive" onClick={() => handleDelete(id)}>
          Delete
        </Button>
      )}
    </>
  );
}
```

**Step 2: Apply to all pages**

- Meetings: create, edit, delete buttons
- Action Items: create, edit, delete, complete buttons
- Resolutions: create, edit, delete, status change buttons
- Documents: upload, delete buttons
- Financials: edit cells, PDF upload/delete
- Members: invite, remove buttons

**Step 3: Commit**

```bash
git add apps/web/app/companies/
git commit -m "feat: add frontend permission checks to hide unauthorized actions"
```

---

### Task 12: Build and Test

**Step 1: Build API**

```bash
cd apps/api && npm run build
```

**Step 2: Build Web**

```bash
cd apps/web && npm run build
```

**Step 3: Run migrations on production**

```bash
npx prisma migrate deploy
npm run prisma:seed
```

**Step 4: Test manually**

1. Create a new company - verify default permissions are created
2. As owner, go to Settings > Permissions
3. Modify ADMIN permissions, save
4. Log in as ADMIN user, verify restricted actions are hidden/blocked
5. Create a custom role, assign permissions
6. Assign custom role to a member, verify access

**Step 5: Commit any fixes and deploy**

```bash
git push origin master
# Deploy to production server
```
