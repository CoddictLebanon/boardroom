# Meetings Module

## Overview

The Meetings module provides comprehensive board meeting management including scheduling, agenda management, attendee tracking, live meeting controls, decisions/voting, and real-time collaboration.

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
  notes       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relations
  company      Company         @relation(fields: [companyId], references: [id], onDelete: Cascade)
  agendaItems  AgendaItem[]
  attendees    MeetingAttendee[]
  decisions    Decision[]
  actionItems  ActionItem[]
  meetingNotes MeetingNote[]
}

model AgendaItem {
  id          String   @id @default(cuid())
  meetingId   String
  title       String
  description String?
  order       Int
  duration    Int?     // minutes
  presenter   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  meeting Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
}

model MeetingAttendee {
  id         String           @id @default(cuid())
  meetingId  String
  memberId   String
  attendance AttendanceStatus @default(PENDING)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  meeting Meeting       @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  member  CompanyMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([meetingId, memberId])
}

model Decision {
  id          String          @id @default(cuid())
  meetingId   String
  title       String
  description String?
  outcome     DecisionOutcome?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  meeting Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  votes   Vote[]
}

model Vote {
  id         String   @id @default(cuid())
  decisionId String
  memberId   String
  vote       VoteType
  createdAt  DateTime @default(now())

  decision Decision @relation(fields: [decisionId], references: [id], onDelete: Cascade)

  @@unique([decisionId, memberId])
}

enum MeetingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum AttendanceStatus {
  PENDING
  PRESENT
  ABSENT
  REMOTE
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
- `status` - Filter by meeting status
- `upcoming` - Show only future meetings
- `past` - Show only past meetings

### Agenda Management

```
POST /api/v1/companies/:companyId/meetings/:id/agenda
PUT  /api/v1/companies/:companyId/meetings/:id/agenda/:itemId
```

Agenda items are auto-ordered. New items get the next order number.

### Attendee Management

```
POST /api/v1/companies/:companyId/meetings/:id/attendees
PUT  /api/v1/companies/:companyId/meetings/:id/attendees/:attendeeId
```

**Attendance Statuses:** PENDING, PRESENT, ABSENT, REMOTE

### Live Meeting Controls

```
POST /api/v1/companies/:companyId/meetings/:id/start
POST /api/v1/companies/:companyId/meetings/:id/pause
POST /api/v1/companies/:companyId/meetings/:id/resume
POST /api/v1/companies/:companyId/meetings/:id/end
```

**State Transitions:**
```
SCHEDULED → IN_PROGRESS (start)
IN_PROGRESS → PAUSED (pause)
PAUSED → IN_PROGRESS (resume)
IN_PROGRESS → COMPLETED (end)
```

### Decisions & Voting

```
POST /api/v1/companies/:companyId/meetings/:id/decisions
POST /api/v1/companies/:companyId/meetings/:id/decisions/:decisionId/vote
PUT  /api/v1/companies/:companyId/meetings/:id/decisions/:decisionId
```

**Vote Request:**
```json
{
  "vote": "FOR"  // FOR, AGAINST, ABSTAIN
}
```

**Update Decision Outcome:**
```json
{
  "outcome": "PASSED"  // PASSED, REJECTED, TABLED
}
```

**Business Rules:**
- Voting only allowed when meeting is IN_PROGRESS
- Each member can vote once per decision
- Outcome can only be set by authorized users

### Meeting Notes

```
PUT /api/v1/companies/:companyId/meetings/:id/notes
```

Updates the meeting-level notes field.

## Real-time Events (WebSocket)

The MeetingsGateway emits these events:

| Event | Payload | Description |
|-------|---------|-------------|
| `meeting:started` | Meeting | Meeting transitioned to IN_PROGRESS |
| `meeting:paused` | Meeting | Meeting paused |
| `meeting:resumed` | Meeting | Meeting resumed |
| `meeting:ended` | Meeting | Meeting completed |
| `attendee:updated` | Attendee | Attendance status changed |
| `decision:created` | Decision | New decision added |
| `vote:cast` | Vote | Vote recorded |
| `note:created` | MeetingNote | Note added |
| `note:updated` | MeetingNote | Note modified |
| `note:deleted` | { noteId } | Note removed |

## Permissions

| Action | Required Permission |
|--------|-------------------|
| View meetings | `meetings.view` |
| Create meeting | `meetings.create` |
| Update meeting | `meetings.update` |
| Delete meeting | `meetings.delete` |
| Start live meeting | `meetings.create` |

## Related Files

- Controller: `src/meetings/meetings.controller.ts`
- Service: `src/meetings/meetings.service.ts`
- Gateway: `src/gateway/meetings.gateway.ts`
- DTOs: `src/meetings/dto/`
