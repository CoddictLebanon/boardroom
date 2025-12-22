# Action Items Module

## Overview

The Action Items module provides task management with assignment, priority levels, status tracking, due dates, and cross-company visibility for assigned users.

## Database Schema

```prisma
model ActionItem {
  id           String           @id @default(cuid())
  companyId    String
  meetingId    String?
  agendaItemId String?
  title        String
  description  String?
  assigneeId   String?
  status       ActionItemStatus @default(PENDING)
  priority     Priority         @default(MEDIUM)
  dueDate      DateTime?
  completedAt  DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  company  Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  meeting  Meeting? @relation(fields: [meetingId], references: [id])
  assignee User?    @relation(fields: [assigneeId], references: [id])
}

enum ActionItemStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  BLOCKED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

## API Endpoints

### Company Action Items

```
POST   /api/v1/companies/:companyId/action-items
GET    /api/v1/companies/:companyId/action-items
GET    /api/v1/companies/:companyId/action-items/:id
PUT    /api/v1/companies/:companyId/action-items/:id
DELETE /api/v1/companies/:companyId/action-items/:id
```

### Status Update

```
PUT /api/v1/companies/:companyId/action-items/:id/status
```

**Request:**
```json
{
  "status": "COMPLETED"
}
```

### My Action Items (Cross-Company)

```
GET /api/v1/action-items/my
```

Returns all action items assigned to the current user across all companies.

## Query Parameters

| Parameter | Description |
|-----------|-------------|
| `status` | Filter by status |
| `priority` | Filter by priority |
| `assigneeId` | Filter by assignee |
| `dueBefore` | Filter items due before date |
| `dueAfter` | Filter items due after date |

## Example Requests

**Create Action Item:**
```json
{
  "title": "Review Q1 Financial Report",
  "description": "Complete detailed review and prepare summary",
  "assigneeId": "user_xxx",
  "priority": "HIGH",
  "dueDate": "2025-02-15T00:00:00Z",
  "meetingId": "optional-meeting-id"
}
```

**Update Status:**
```json
{
  "status": "IN_PROGRESS"
}
```

## Status Transitions

```
PENDING → IN_PROGRESS → COMPLETED
        → BLOCKED → IN_PROGRESS
        → CANCELLED
```

- `completedAt` is automatically set when status changes to COMPLETED
- No strict transition rules - any status can change to any other

## Real-time Updates

Action item changes emit WebSocket events for optimistic UI updates:

| Event | Description |
|-------|-------------|
| `actionItem:created` | New action item added |
| `actionItem:updated` | Action item modified |
| `actionItem:deleted` | Action item removed |

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View action items | `action-items.view` |
| Create action item | `action-items.create` |
| Update action item | `action-items.update` |
| Delete action item | `action-items.delete` |
| Update own status | `action-items.update` (assignee can always update status) |

## Related Files

- Controller: `src/action-items/action-items.controller.ts`
- Service: `src/action-items/action-items.service.ts`
- DTOs: `src/action-items/dto/`
