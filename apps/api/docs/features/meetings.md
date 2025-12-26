# Meetings Module

## Overview

The Meetings module provides comprehensive board meeting management including:
- Meeting scheduling and lifecycle management
- Agenda items with drag-and-drop reordering
- Real-time attendance tracking
- Decisions with voting
- Meeting notes (see `meeting-notes.md`)
- Action items
- Document uploads

All features support real-time collaboration via Socket.IO - no page refresh required.

## Database Schema

```prisma
model Meeting {
  id          String        @id @default(cuid())
  companyId   String
  title       String
  description String?
  scheduledAt DateTime
  duration    Int           // minutes
  location    String?
  status      MeetingStatus @default(SCHEDULED)
  notes       String?       // Legacy notes field
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  company       Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  agendaItems   AgendaItem[]
  attendees     MeetingAttendee[]
  decisions     Decision[]
  actionItems   ActionItem[]
  meetingNotes  MeetingNote[]
  documents     MeetingDocument[]
}

model AgendaItem {
  id          String   @id @default(cuid())
  meetingId   String
  title       String
  description String?
  order       Int      @default(0)
  duration    Int?     // minutes
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  meeting   Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  createdBy User?   @relation(fields: [createdById], references: [id])
}

model MeetingAttendee {
  id        String   @id @default(cuid())
  meetingId String
  memberId  String
  isPresent Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  meeting Meeting       @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  member  CompanyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([meetingId, memberId])
}

model Decision {
  id          String           @id @default(cuid())
  meetingId   String
  title       String
  description String?
  outcome     DecisionOutcome?
  order       Int              @default(0)
  createdById String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  meeting   Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  createdBy User?   @relation(fields: [createdById], references: [id])
  votes     Vote[]
}

model Vote {
  id         String   @id @default(cuid())
  decisionId String
  userId     String   // Clerk user ID directly
  vote       VoteType
  createdAt  DateTime @default(now())

  decision Decision @relation(fields: [decisionId], references: [id], onDelete: Cascade)

  @@unique([decisionId, userId])
}

enum MeetingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum VoteType {
  FOR
  AGAINST
  ABSTAIN
}

enum DecisionOutcome {
  PASSED
  REJECTED
  TABLED
}
```

## API Endpoints

### Meeting CRUD

```
POST   /api/v1/companies/:companyId/meetings
GET    /api/v1/companies/:companyId/meetings
GET    /api/v1/companies/:companyId/meetings/:id
PUT    /api/v1/companies/:companyId/meetings/:id
DELETE /api/v1/companies/:companyId/meetings/:id
```

**Query Parameters for List:**
- `status` - Filter by meeting status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED)
- `upcoming` - Show only future meetings
- `past` - Show only past meetings

### Meeting Status Controls

```
POST /api/v1/companies/:companyId/meetings/:id/start
POST /api/v1/companies/:companyId/meetings/:id/end
```

**State Transitions:**
```
SCHEDULED → IN_PROGRESS (start)
IN_PROGRESS → COMPLETED (end)
```

### Agenda Items (Full CRUD)

```
POST   /api/v1/companies/:companyId/meetings/:meetingId/agenda
GET    /api/v1/companies/:companyId/meetings/:meetingId/agenda
PUT    /api/v1/companies/:companyId/meetings/:meetingId/agenda/:itemId
DELETE /api/v1/companies/:companyId/meetings/:meetingId/agenda/:itemId
PUT    /api/v1/companies/:companyId/meetings/:meetingId/agenda/reorder
```

**Create/Update Request:**
```json
{
  "title": "Review Q4 Budget",
  "description": "Detailed review of quarterly expenses",
  "duration": 30
}
```

**Reorder Request:**
```json
{
  "itemIds": ["item-id-3", "item-id-1", "item-id-2"]
}
```

### Attendee Management

```
POST /api/v1/companies/:companyId/meetings/:id/attendees
PUT  /api/v1/companies/:companyId/meetings/:id/attendees/:attendeeId
```

**Update Attendance:**
```json
{
  "isPresent": true
}
```

### Decisions (Full CRUD)

```
POST   /api/v1/companies/:companyId/meetings/:meetingId/decisions
GET    /api/v1/companies/:companyId/meetings/:meetingId/decisions
PUT    /api/v1/companies/:companyId/meetings/:meetingId/decisions/:decisionId
DELETE /api/v1/companies/:companyId/meetings/:meetingId/decisions/:decisionId
PUT    /api/v1/companies/:companyId/meetings/:meetingId/decisions/reorder
```

**Create Decision:**
```json
{
  "title": "Approve Q4 Budget",
  "description": "Approve the proposed quarterly budget"
}
```

**Update Decision (set outcome):**
```json
{
  "outcome": "PASSED"
}
```

### Voting

```
POST /api/v1/companies/:companyId/meetings/:meetingId/decisions/:decisionId/vote
```

**Vote Request:**
```json
{
  "vote": "FOR"
}
```

**Vote Types:** `FOR`, `AGAINST`, `ABSTAIN`

**Voting Business Rules:**
1. Meeting must be `IN_PROGRESS`
2. User must be a company member
3. User must be a meeting attendee with `isPresent: true`
4. Each user can only vote once per decision (subsequent votes update the existing vote)
5. Users who join after a decision was created CAN vote if they mark themselves as present
6. Voting is not allowed on decisions that have an outcome (PASSED/REJECTED)

### Action Items

```
POST   /api/v1/companies/:companyId/meetings/:meetingId/action-items
GET    /api/v1/companies/:companyId/meetings/:meetingId/action-items
PUT    /api/v1/companies/:companyId/action-items/:itemId
DELETE /api/v1/companies/:companyId/action-items/:itemId
PUT    /api/v1/companies/:companyId/meetings/:meetingId/action-items/reorder
```

### Document Uploads

```
POST /api/v1/companies/:companyId/meetings/:meetingId/documents
GET  /api/v1/companies/:companyId/meetings/:meetingId/documents
DELETE /api/v1/companies/:companyId/documents/:documentId
```

**Upload Request (multipart/form-data):**
- `file`: The file to upload
- `name`: Document name
- `description`: Optional description
- `type`: Must be one of: `MEETING`, `FINANCIAL`, `GOVERNANCE`, `GENERAL`

**Note:** Files are stored with timestamp + random suffix to prevent name collisions. Two files with the same name will NOT overwrite each other.

## WebSocket Gateway

### Connection

**Namespace:** `/meetings`

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/meetings', {
  auth: { token: 'clerk_session_jwt' }
});
```

### Authentication

The gateway verifies Clerk JWT tokens on connection. Invalid/missing tokens result in disconnection.

**IMPORTANT:** All IDs use CUIDs (not UUIDs). The WebSocket DTOs validate strings but do NOT enforce UUID format.

### Client Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `meeting:join` | `{ meetingId: string }` | Join a meeting room |
| `meeting:leave` | `{ meetingId: string }` | Leave a meeting room |
| `vote:cast` | `{ decisionId: string, vote: VoteType }` | Cast a vote |
| `attendance:update` | `{ meetingId: string, isPresent: boolean }` | Update own attendance |
| `meeting:status` | `{ meetingId: string, status: MeetingStatus }` | Update meeting status (admin) |

### Server Events (Server → Client)

All events are broadcast to users in the meeting room.

**Meeting Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `meeting:status:updated` | `{ meetingId, status, updatedAt }` | Meeting status changed |
| `attendee:joined` | `{ userId, meetingId }` | User joined meeting room |
| `attendee:left` | `{ userId, meetingId }` | User left meeting room |
| `attendance:updated` | `{ meetingId, userId, isPresent }` | Attendance status changed |

**Agenda Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `agenda:created` | AgendaItem | New agenda item added |
| `agenda:updated` | AgendaItem | Agenda item modified |
| `agenda:deleted` | `{ id: string }` | Agenda item removed |
| `agenda:reordered` | `{ itemIds: string[] }` | Agenda order changed |

**Decision Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `decision:created` | Decision | New decision added |
| `decision:updated` | Decision | Decision modified |
| `decision:deleted` | `{ id: string }` | Decision removed |
| `decision:reordered` | `{ decisionIds: string[] }` | Decision order changed |
| `vote:updated` | `{ decisionId, voterId, vote, tally }` | Vote cast/changed |

**Note Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `note:created` | MeetingNote | New note added |
| `note:updated` | MeetingNote | Note modified |
| `note:deleted` | `{ id: string }` | Note removed |
| `notes:reordered` | `{ noteIds: string[] }` | Notes order changed |

**Action Item Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `actionItem:created` | ActionItem | New action item added |
| `actionItem:updated` | ActionItem | Action item modified |
| `actionItem:deleted` | `{ id: string }` | Action item removed |
| `actionItem:reordered` | `{ itemIds: string[] }` | Action items order changed |

## Frontend Integration

### React Hook: useMeetingSocket

```typescript
import { useMeetingSocket } from '@/lib/socket/use-meeting-socket';

function LiveMeeting({ meetingId }) {
  const {
    isConnected,
    isInMeeting,
    currentAttendees,
    error,
    // Actions
    castVote,
    updateAttendance,
    updateMeetingStatus,
    // Event handlers
    onVoteUpdate,
    onAttendeeJoined,
    onAttendeeLeft,
    onAttendanceUpdate,
    onMeetingStatusUpdate,
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onAgendaCreated,
    onAgendaUpdated,
    onAgendaDeleted,
    onAgendaReordered,
    onDecisionCreated,
    onDecisionUpdated,
    onDecisionDeleted,
    onDecisionReordered,
    onActionItemCreated,
    onActionItemUpdated,
    onActionItemDeleted,
    onActionItemReordered,
  } = useMeetingSocket(meetingId);

  // Auto-joins meeting room when connected
  // Auto-leaves on unmount
}
```

### Local State Management

The live meeting page maintains local state for each feature:
- `notes`, `agendaItems`, `decisions`, `actionItems`

State is initialized from meeting data and updated via socket events. No `refetch()` calls are needed after CRUD operations.

## Live Meeting Features

### During Active Meetings (IN_PROGRESS)

When a meeting is in progress, users can:
- **Agenda Items:** Add, edit, delete, and drag-to-reorder
- **Decisions:** Add, edit, delete, drag-to-reorder, cast votes, close voting
- **Notes:** Add, edit, delete, drag-to-reorder
- **Action Items:** Add, edit, delete, drag-to-reorder
- **Documents:** Upload and delete files
- **Attendance:** Mark self as present/absent

All changes sync in real-time across all connected clients.

### Edit/Delete UI

Each item (agenda, decision, action item) shows a three-dot menu (⋮) with Edit and Delete options when the meeting is active.

### Drag-and-Drop

All lists support drag-and-drop reordering using dnd-kit:
- Grab handle appears on the left of each item
- Order persists to database
- Changes broadcast via socket events

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View meetings | `meetings.view` |
| Create meeting | `meetings.create` |
| Update meeting | `meetings.edit` |
| Delete meeting | `meetings.delete` |
| Start/end meeting | `meetings.edit` |
| Manage agenda | `meetings.edit` |
| Manage decisions | `meetings.edit` |
| Cast vote | Being a present attendee |

## Technical Notes

### ID Format
- All IDs are CUIDs (e.g., `cmjiveiwo001g2vlnnttmwtd7`)
- NOT UUIDs - do not use UUID validators on these fields

### Socket Event Emissions
Socket events are emitted from services after database operations:
```typescript
try {
  this.meetingsGateway.emitToMeeting(meetingId, 'agenda:created', item);
} catch (error) {
  this.logger.error(`Failed to emit agenda:created: ${error.message}`);
}
```
Failures to emit do not affect API responses.

### File Storage
- Files stored in `uploads/` directory
- Filename: `{timestamp}-{random}.{ext}` prevents collisions
- Cleanup: Files are deleted when meeting/document is deleted

## Related Files

**Backend:**
- `src/meetings/meetings.controller.ts`
- `src/meetings/meetings.service.ts`
- `src/agenda-items/agenda-items.controller.ts`
- `src/agenda-items/agenda-items.service.ts`
- `src/meeting-notes/meeting-notes.controller.ts`
- `src/meeting-notes/meeting-notes.service.ts`
- `src/action-items/action-items.controller.ts`
- `src/action-items/action-items.service.ts`
- `src/gateway/meetings.gateway.ts`
- `src/gateway/dto/index.ts`

**Frontend:**
- `apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx`
- `apps/web/lib/socket/socket-context.tsx`
- `apps/web/lib/socket/use-meeting-socket.ts`
