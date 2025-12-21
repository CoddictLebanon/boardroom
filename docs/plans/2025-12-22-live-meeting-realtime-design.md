# Live Meeting Real-time Features Design

**Date:** 2025-12-22
**Status:** Approved

## Overview

Implement real-time Socket.IO features for the live meeting page. Make action items, decisions, and agenda items work like notes - no page refresh, real-time updates across clients, and drag-and-drop sorting.

## Current State

| Feature | Real-time | Sorting | CRUD in Live Meeting |
|---------|-----------|---------|---------------------|
| Notes | Yes | Yes (drag-drop) | Yes |
| Action Items | No (uses refetch) | No | Yes |
| Decisions | Partial (votes only) | No | Yes |
| Agenda Items | No | No | No (read-only) |

## Target State

All four features will have:
- Full CRUD operations in live meeting
- Real-time Socket.IO updates (no page refresh)
- Drag-and-drop sorting with dnd-kit
- Order persistence in database

## Design Decisions

1. **Full CRUD for agenda items** - Add/edit/delete/reorder during meetings
2. **Drag-and-drop for all three** - Consistent UX with grip handles and dnd-kit
3. **REST + socket emit pattern** - Keep REST API, emit socket events for sync
4. **Add `order` column** - Database schema changes for persistent sorting

## Database Schema Changes

Add `order` integer field to three models in `prisma/schema.prisma`:

```prisma
model AgendaItem {
  // ... existing fields
  order       Int       @default(0)
}

model Decision {
  // ... existing fields
  order       Int       @default(0)
}

model ActionItem {
  // ... existing fields
  order       Int       @default(0)
}
```

**Migration strategy:**
- Create migration adding `order` column with default 0
- Set initial order based on `createdAt` timestamp

## Socket Events

### Agenda Items
- `agenda:created` - New agenda item added
- `agenda:updated` - Agenda item edited
- `agenda:deleted` - Agenda item removed
- `agenda:reordered` - Order changed

### Decisions
- `decision:created` - New decision added
- `decision:updated` - Decision edited
- `decision:deleted` - Decision removed
- `decision:reordered` - Order changed
- `vote:updated` - (existing) Vote cast/changed

### Action Items
- `action:created` - New action item added
- `action:updated` - Action item edited
- `action:deleted` - Action item removed
- `action:reordered` - Order changed

## Frontend Architecture

### New hooks in `use-meeting-socket.ts`

```typescript
// Agenda Items
onAgendaCreated(callback: (item: AgendaItem) => void)
onAgendaUpdated(callback: (item: AgendaItem) => void)
onAgendaDeleted(callback: (event: { id: string }) => void)
onAgendaReordered(callback: (event: { itemIds: string[] }) => void)

// Decisions
onDecisionCreated(callback: (decision: Decision) => void)
onDecisionUpdated(callback: (decision: Decision) => void)
onDecisionDeleted(callback: (event: { id: string }) => void)
onDecisionReordered(callback: (event: { itemIds: string[] }) => void)

// Action Items
onActionCreated(callback: (action: ActionItem) => void)
onActionUpdated(callback: (action: ActionItem) => void)
onActionDeleted(callback: (event: { id: string }) => void)
onActionReordered(callback: (event: { itemIds: string[] }) => void)
```

### Live meeting page changes
1. Add local state for each feature
2. Initialize from meeting data
3. Subscribe to socket events on mount
4. Remove all `await refetch()` calls
5. Add sortable components for each feature
6. Add inline/dialog forms for CRUD

## Backend Architecture

### Service changes
Each service emits socket events after operations:

```typescript
// After save operations
this.meetingsGateway.emitToMeeting(meetingId, 'agenda:created', savedItem);
```

### New REST endpoints
- `PUT /companies/:companyId/meetings/:meetingId/agenda/reorder`
- `PUT /companies/:companyId/meetings/:meetingId/decisions/reorder`
- `PUT /companies/:companyId/meetings/:meetingId/action-items/reorder`

### Agenda item endpoints (new)
- `POST /companies/:companyId/meetings/:meetingId/agenda` - Create
- `PUT /companies/:companyId/meetings/:meetingId/agenda/:itemId` - Update
- `DELETE /companies/:companyId/meetings/:meetingId/agenda/:itemId` - Delete

## Testing Strategy

### API E2E Tests
1. `agenda-items.e2e-spec.ts` - CRUD + reorder + permissions
2. `decisions.e2e-spec.ts` - CRUD + reorder + socket events
3. `action-items.e2e-spec.ts` - Add reorder tests

### Web E2E Tests
1. `live-meeting-realtime.spec.ts` - Real-time updates without refresh
2. `live-meeting-sorting.spec.ts` - Drag-and-drop, persistence, sync

## Implementation Order

1. Database schema migration
2. Backend services with socket emits
3. Frontend socket hooks
4. Frontend UI components
5. API E2E tests
6. Web E2E tests
