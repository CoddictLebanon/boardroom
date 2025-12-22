# Permission Context

This directory contains the frontend permission system for the BoardMeeting application.

## Overview

The permission context provides a React Context and hooks for checking user permissions in the Next.js frontend. It fetches permissions from the backend API and caches them for the current company context.

## Files

- `permission-context.tsx` - Main context implementation with provider and hooks
- `index.ts` - Exports for clean imports

## Usage

### 1. Provider Setup (Already Done)

The `PermissionProvider` is already wrapped around the company layout in `apps/web/app/companies/[companyId]/layout-client.tsx`:

```tsx
import { PermissionProvider } from "@/lib/permissions";

export function CompanyLayoutClient({ companyId, children }) {
  return (
    <PermissionProvider companyId={companyId}>
      {children}
    </PermissionProvider>
  );
}
```

### 2. Using `usePermission` Hook

The simplest way to check a single permission:

```tsx
import { usePermission } from "@/lib/permissions";

function MeetingsPage() {
  const canCreate = usePermission('meetings.create');
  const canDelete = usePermission('meetings.delete');

  return (
    <>
      {canCreate && (
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Meeting
        </Button>
      )}

      {canDelete && (
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      )}
    </>
  );
}
```

### 3. Using `usePermissions` Hook

For more advanced use cases where you need multiple checks or access to the full context:

```tsx
import { usePermissions } from "@/lib/permissions";

function ActionItemsPage() {
  const { hasPermission, hasAnyPermission, isLoading, refresh } = usePermissions();

  // Check single permission
  const canEdit = hasPermission('action_items.edit');

  // Check if user has any of multiple permissions
  const canModify = hasAnyPermission(['action_items.edit', 'action_items.delete']);

  // Refresh permissions manually if needed
  const handleRefresh = async () => {
    await refresh();
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      {canEdit && <EditButton />}
      {canModify && <ModifyButton />}
    </>
  );
}
```

### 4. Permission Codes

Available permission codes (from the backend):

#### Meetings
- `meetings.view` - View meetings
- `meetings.create` - Create meetings
- `meetings.edit` - Edit meetings
- `meetings.delete` - Delete meetings
- `meetings.start_live` - Start live meeting sessions

#### Action Items
- `action_items.view` - View action items
- `action_items.create` - Create action items
- `action_items.edit` - Edit action items
- `action_items.delete` - Delete action items
- `action_items.complete` - Mark action items complete

#### Resolutions
- `resolutions.view` - View resolutions
- `resolutions.create` - Create resolutions
- `resolutions.edit` - Edit resolutions
- `resolutions.delete` - Delete resolutions
- `resolutions.change_status` - Change resolution status

#### Documents
- `documents.view` - View documents
- `documents.upload` - Upload documents
- `documents.download` - Download documents
- `documents.delete` - Delete documents

#### Financials
- `financials.view` - View financial data
- `financials.edit` - Edit financial data
- `financials.manage_pdfs` - Upload/delete financial PDFs

#### Members
- `members.view` - View company members
- `members.invite` - Invite new members
- `members.remove` - Remove members
- `members.change_roles` - Change member roles

#### Company
- `company.view_settings` - View company settings
- `company.edit_settings` - Edit company settings

## Implementation Details

### Features

1. **Automatic Fetching**: Permissions are automatically fetched when the component mounts or when `companyId` changes
2. **Clerk Integration**: Uses Clerk's `getToken()` for authentication
3. **Caching**: Permissions are cached in React state and only refetched when necessary
4. **Loading State**: Provides `isLoading` to handle UI states during fetch
5. **Manual Refresh**: Expose `refresh()` function to manually refetch permissions
6. **Security**: Returns `false` while loading to prevent flash of unauthorized content

### API Endpoint

The context fetches from:
```
GET /companies/:companyId/my-permissions
```

Expected response:
```json
{
  "permissions": ["meetings.view", "meetings.create", ...]
}
```

### Type Safety

All hooks are fully typed with TypeScript:

```typescript
interface PermissionContextType {
  permissions: Set<string>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}
```

## Best Practices

1. **Use `usePermission` for simple checks**: When you only need to check one permission, use the `usePermission(code)` hook
2. **Conditional Rendering**: Hide UI elements based on permissions to improve UX
3. **Loading States**: The `usePermission` hook returns `false` during loading to prevent unauthorized content from briefly appearing
4. **Backend Validation**: Remember that frontend permission checks are for UX only - the backend must also enforce permissions
5. **Permission Names**: Always use the exact permission code strings from the backend

## Example: Complete Component

```tsx
"use client";

import { usePermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash } from "lucide-react";

export default function MeetingsPage() {
  const canView = usePermission('meetings.view');
  const canCreate = usePermission('meetings.create');
  const canEdit = usePermission('meetings.edit');
  const canDelete = usePermission('meetings.delete');

  if (!canView) {
    return <div>You don't have permission to view meetings.</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Meetings</h1>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        )}
      </div>

      {/* Meeting list with conditional action buttons */}
      <div>
        {meetings.map((meeting) => (
          <div key={meeting.id}>
            <span>{meeting.title}</span>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm">
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```
