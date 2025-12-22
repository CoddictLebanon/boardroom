# Meeting Notes & Real-time Module

## Overview

The Meeting Notes module provides multi-user note-taking during meetings with real-time collaboration via WebSockets. Each note is attributed to its author with timestamps.

## Database Schema

```prisma
model MeetingNote {
  id          String   @id @default(cuid())
  meetingId   String
  content     String
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  meeting   Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  createdBy User    @relation(fields: [createdById], references: [id])
}
```

## API Endpoints

```
POST   /api/v1/companies/:companyId/meetings/:meetingId/notes
GET    /api/v1/companies/:companyId/meetings/:meetingId/notes
GET    /api/v1/companies/:companyId/meetings/:meetingId/notes/:noteId
PUT    /api/v1/companies/:companyId/meetings/:meetingId/notes/:noteId
DELETE /api/v1/companies/:companyId/meetings/:meetingId/notes/:noteId
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

## Real-time WebSocket Events

### Gateway: MeetingsGateway

**Connection:**
```javascript
const socket = io('http://localhost:3001', {
  auth: { token: 'clerk_session_token' }
});

// Join meeting room
socket.emit('join:meeting', { meetingId: 'cmj...' });
```

### Note Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `note:created` | Server → Client | MeetingNote | New note added |
| `note:updated` | Server → Client | MeetingNote | Note content modified |
| `note:deleted` | Server → Client | `{ noteId: string }` | Note removed |

### Meeting Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `meeting:started` | Server → Client | Meeting | Meeting went live |
| `meeting:paused` | Server → Client | Meeting | Meeting paused |
| `meeting:resumed` | Server → Client | Meeting | Meeting resumed |
| `meeting:ended` | Server → Client | Meeting | Meeting completed |
| `attendee:updated` | Server → Client | Attendee | Attendance changed |
| `decision:created` | Server → Client | Decision | New decision |
| `vote:cast` | Server → Client | Vote | Vote recorded |

### Action Item Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `actionItem:created` | Server → Client | ActionItem | New action item |
| `actionItem:updated` | Server → Client | ActionItem | Action item modified |
| `actionItem:deleted` | Server → Client | `{ id: string }` | Action item removed |

## Frontend Integration

### React Hook: useMeetingSocket

```typescript
import { useMeetingSocket } from '@/lib/socket/use-meeting-socket';

function LiveMeeting({ meetingId }) {
  const {
    isConnected,
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
    onMeetingStarted,
    onAttendeeUpdated
  } = useMeetingSocket(meetingId);

  useEffect(() => {
    const unsubCreate = onNoteCreated((note) => {
      setNotes(prev => [...prev, note]);
    });

    const unsubUpdate = onNoteUpdated((note) => {
      setNotes(prev => prev.map(n => n.id === note.id ? note : n));
    });

    const unsubDelete = onNoteDeleted(({ noteId }) => {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    });

    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, []);
}
```

## Access Control

- Only ACTIVE members of the meeting's company can access notes
- Users can only edit/delete their own notes
- Real-time events are scoped to the meeting room

## Error Handling

WebSocket emissions are wrapped in try/catch to prevent failures from affecting API responses:

```typescript
try {
  this.meetingsGateway.emitToMeeting(meetingId, 'note:created', note);
} catch (error) {
  this.logger.error(`Failed to emit note:created: ${error.message}`);
}
```

## Related Files

- Notes Controller: `src/meeting-notes/meeting-notes.controller.ts`
- Notes Service: `src/meeting-notes/meeting-notes.service.ts`
- Gateway: `src/gateway/meetings.gateway.ts`
- Gateway Module: `src/gateway/gateway.module.ts`
- Frontend Hook: `apps/web/lib/socket/use-meeting-socket.ts`
