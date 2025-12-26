# Meeting Notes Module

## Overview

The Meeting Notes module provides multi-user note-taking during meetings with real-time collaboration via WebSockets. Each note is attributed to its author with timestamps. Notes support drag-and-drop reordering.

## Database Schema

```prisma
model MeetingNote {
  id          String   @id @default(cuid())
  meetingId   String
  content     String
  order       Int      @default(0)
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  meeting   Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  createdBy User    @relation(fields: [createdById], references: [id])

  @@index([meetingId])
}
```

## API Endpoints

```
POST   /api/v1/companies/:companyId/meetings/:meetingId/notes
GET    /api/v1/companies/:companyId/meetings/:meetingId/notes
GET    /api/v1/companies/:companyId/meetings/:meetingId/notes/:noteId
PUT    /api/v1/companies/:companyId/meetings/:meetingId/notes/:noteId
DELETE /api/v1/companies/:companyId/meetings/:meetingId/notes/:noteId
PUT    /api/v1/companies/:companyId/meetings/:meetingId/notes/reorder
```

**Create Note:**
```json
{
  "content": "Discussion point about Q1 budget allocation..."
}
```

**Response:**
```json
{
  "id": "cmj...",
  "meetingId": "cmj...",
  "content": "Discussion point about Q1 budget allocation...",
  "order": 0,
  "createdById": "user_xxx",
  "createdBy": {
    "id": "user_xxx",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "imageUrl": "https://..."
  },
  "createdAt": "2025-01-15T14:30:00Z",
  "updatedAt": "2025-01-15T14:30:00Z"
}
```

**Reorder Notes:**
```json
{
  "noteIds": ["note-id-3", "note-id-1", "note-id-2"]
}
```

## Real-time WebSocket Events

### Gateway: MeetingsGateway

**Connection:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/meetings', {
  auth: { token: 'clerk_session_jwt' }
});

// Join meeting room
socket.emit('meeting:join', { meetingId: 'cmj...' });
```

### Note Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `note:created` | Server → Client | MeetingNote | New note added |
| `note:updated` | Server → Client | MeetingNote | Note content modified |
| `note:deleted` | Server → Client | `{ id: string }` | Note removed |
| `notes:reordered` | Server → Client | `{ noteIds: string[] }` | Notes order changed |

## Frontend Integration

### React Hook: useMeetingSocket

```typescript
import { useMeetingSocket } from '@/lib/socket/use-meeting-socket';

function LiveMeetingNotes({ meetingId }) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);

  const {
    isConnected,
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onNotesReordered,
  } = useMeetingSocket(meetingId);

  // Initialize from meeting data
  useEffect(() => {
    if (meeting?.meetingNotes) {
      setNotes(meeting.meetingNotes);
    }
  }, [meeting]);

  // Subscribe to socket events
  useEffect(() => {
    const unsubCreate = onNoteCreated((note) => {
      setNotes(prev => {
        if (prev.some(n => n.id === note.id)) return prev;
        return [...prev, note].sort((a, b) => a.order - b.order);
      });
    });

    const unsubUpdate = onNoteUpdated((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    });

    const unsubDelete = onNoteDeleted(({ id }) => {
      setNotes(prev => prev.filter(n => n.id !== id));
    });

    const unsubReorder = onNotesReordered(({ noteIds }) => {
      setNotes(prev => {
        const map = new Map(prev.map(n => [n.id, n]));
        return noteIds.map(id => map.get(id)).filter(Boolean) as MeetingNote[];
      });
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
      unsubReorder();
    };
  }, [onNoteCreated, onNoteUpdated, onNoteDeleted, onNotesReordered]);
}
```

## Access Control

- Only ACTIVE members of the meeting's company can access notes
- Users can only edit/delete their own notes (enforced at service level)
- Real-time events are scoped to the meeting room
- Permission required: `meetings.view` for reading, `meetings.edit` for CRUD

## Drag-and-Drop Reordering

Notes support drag-and-drop using dnd-kit:
- Grab handle on the left of each note
- Order persists to database via `PUT /notes/reorder`
- Changes broadcast to all clients via `notes:reordered` event

## Error Handling

WebSocket emissions are wrapped in try/catch to prevent failures from affecting API responses:

```typescript
try {
  this.meetingsGateway.emitToMeeting(meetingId, 'note:created', note);
} catch (error) {
  this.logger.error(`Failed to emit note:created: ${error.message}`);
}
```

## Technical Notes

### ID Format
- All IDs are CUIDs (e.g., `cmjiveiwo001g2vlnnttmwtd7`)
- NOT UUIDs - do not use UUID validators

### No Page Refresh Required
After CRUD operations, state is updated via socket events. The frontend does NOT call `refetch()` after mutations.

## Related Files

**Backend:**
- `src/meeting-notes/meeting-notes.controller.ts`
- `src/meeting-notes/meeting-notes.service.ts`
- `src/gateway/meetings.gateway.ts`
- `src/gateway/gateway.module.ts`

**Frontend:**
- `apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx`
- `apps/web/lib/socket/use-meeting-socket.ts`
