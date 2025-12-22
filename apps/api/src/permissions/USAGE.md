# Permission Guard and Decorator Usage

## Overview

The `@RequirePermission` decorator and `PermissionGuard` provide role-based access control for API endpoints.

## How It Works

1. **Decorator**: `@RequirePermission()` marks endpoints with required permissions
2. **Guard**: `PermissionGuard` checks if the authenticated user has the required permissions
3. **Service**: `PermissionsService.hasAnyPermission()` performs the actual permission check

## Basic Usage

### Single Permission

```typescript
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class MeetingsController {
  @Post('companies/:companyId/meetings')
  @RequirePermission('meetings.create')
  async createMeeting() {
    // Only users with 'meetings.create' permission can access this
  }
}
```

### Multiple Permissions (OR Logic)

```typescript
@Delete('meetings/:id')
@RequirePermission('meetings.delete', 'meetings.edit')
async deleteMeeting() {
  // User needs either 'meetings.delete' OR 'meetings.edit'
  // Having ANY ONE of these permissions grants access
}
```

### Controller-Level Guard

Apply guards to the entire controller:

```typescript
@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class MeetingsController {
  // All endpoints in this controller will use both guards

  @Get('companies/:companyId/meetings')
  @RequirePermission('meetings.view')
  async findAll() { }

  @Post('companies/:companyId/meetings')
  @RequirePermission('meetings.create')
  async create() { }
}
```

## Important Notes

1. **Guard Order**: Always use `ClerkAuthGuard` BEFORE `PermissionGuard`
   - `ClerkAuthGuard` authenticates the user and sets `request.auth`
   - `PermissionGuard` reads `request.auth.userId` to check permissions

2. **Company Context**: The guard requires `companyId` in route params
   - Routes must include `:companyId` parameter
   - Example: `companies/:companyId/meetings`

3. **Owner Bypass**: Users with OWNER role automatically pass all permission checks

4. **Missing Permissions**: If no `@RequirePermission` decorator is present, the guard allows access

## Error Responses

### Missing Authentication
```json
{
  "statusCode": 403,
  "message": "User authentication required",
  "error": "Forbidden"
}
```

### Missing Company Context
```json
{
  "statusCode": 403,
  "message": "Company context required",
  "error": "Forbidden"
}
```

### Insufficient Permissions
```json
{
  "statusCode": 403,
  "message": "Missing required permission: meetings.create or meetings.edit",
  "error": "Forbidden"
}
```

## Permission Codes

Available permission codes (from the plan):

- **Meetings**: `meetings.view`, `meetings.create`, `meetings.edit`, `meetings.delete`, `meetings.start_live`
- **Action Items**: `action_items.view`, `action_items.create`, `action_items.edit`, `action_items.delete`, `action_items.complete`
- **Resolutions**: `resolutions.view`, `resolutions.create`, `resolutions.edit`, `resolutions.delete`, `resolutions.change_status`
- **Documents**: `documents.view`, `documents.upload`, `documents.download`, `documents.delete`
- **Financials**: `financials.view`, `financials.edit`, `financials.manage_pdfs`
- **Members**: `members.view`, `members.invite`, `members.remove`, `members.change_roles`
- **Company**: `company.view_settings`, `company.edit_settings`
