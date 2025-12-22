# Implementation Plan: Real-time Meeting Notes with Full-width Layout

## Overview
Add a new MeetingNote model with full real-time collaboration, establish clean WebSocket patterns, and restructure the live meeting page layout to full-width stacked sections.

## Phase 1: Notes with Real-time (Current Scope)

---

## Task 1: Add MeetingNote Model to Prisma Schema

**File:** `apps/api/prisma/schema.prisma`

**Changes:**
1. Add `MeetingNote` model after the existing Meeting-related models (~line 215)
2. Add `notes` relation to `Meeting` model
3. Add `meetingNotes` relation to `User` model

**Code to add after `MeetingSummary` model:**
```prisma
model MeetingNote {
  id          String   @id @default(cuid())
  meetingId   String
  content     String
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  meeting   Meeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  createdBy User    @relation("NoteCreator", fields: [createdById], references: [id])

  @@index([meetingId])
  @@index([createdById])
}
```

**Update Meeting model (~line 134):**
```prisma
// Add to Meeting model relations:
notes       MeetingNote[]
```

**Update User model (~line 15):**
```prisma
// Add to User model relations:
createdNotes            MeetingNote[]          @relation("NoteCreator")
```

**Verification:** Run `npx prisma db push` and verify no errors

---

## Task 2: Create Meeting Notes Module Structure

**Create directory:** `apps/api/src/meeting-notes/`

**Files to create:**
- `apps/api/src/meeting-notes/meeting-notes.module.ts`
- `apps/api/src/meeting-notes/meeting-notes.controller.ts`
- `apps/api/src/meeting-notes/meeting-notes.service.ts`
- `apps/api/src/meeting-notes/dto/index.ts`
- `apps/api/src/meeting-notes/dto/create-meeting-note.dto.ts`
- `apps/api/src/meeting-notes/dto/update-meeting-note.dto.ts`

---

## Task 3: Create DTOs

**File:** `apps/api/src/meeting-notes/dto/create-meeting-note.dto.ts`
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMeetingNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
```

**File:** `apps/api/src/meeting-notes/dto/update-meeting-note.dto.ts`
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateMeetingNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
```

**File:** `apps/api/src/meeting-notes/dto/index.ts`
```typescript
export * from './create-meeting-note.dto';
export * from './update-meeting-note.dto';
```

---

## Task 4: Create Meeting Notes Service

**File:** `apps/api/src/meeting-notes/meeting-notes.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingNoteDto, UpdateMeetingNoteDto } from './dto';
import { MeetingsGateway } from '../gateway/meetings.gateway';

@Injectable()
export class MeetingNotesService {
  constructor(
    private prisma: PrismaService,
    private meetingsGateway: MeetingsGateway,
  ) {}

  private readonly noteInclude = {
    createdBy: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        imageUrl: true,
      },
    },
  };

  async create(meetingId: string, dto: CreateMeetingNoteDto, userId: string) {
    // Verify meeting exists and user has access
    const meeting = await this.verifyMeetingAccess(meetingId, userId);

    const note = await this.prisma.meetingNote.create({
      data: {
        meetingId,
        content: dto.content,
        createdById: userId,
      },
      include: this.noteInclude,
    });

    // Broadcast to all clients in the meeting room
    this.meetingsGateway.emitToMeeting(meetingId, 'note:created', { note });

    return note;
  }

  async findAllByMeeting(meetingId: string, userId: string) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(meetingId, userId);

    return this.prisma.meetingNote.findMany({
      where: { meetingId },
      include: this.noteInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateMeetingNoteDto, userId: string) {
    const note = await this.prisma.meetingNote.findUnique({
      where: { id },
      include: { meeting: true },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the meeting
    await this.verifyMeetingAccess(note.meetingId, userId);

    // Only the creator can edit their note
    if (note.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own notes');
    }

    const updatedNote = await this.prisma.meetingNote.update({
      where: { id },
      data: { content: dto.content },
      include: this.noteInclude,
    });

    // Broadcast to all clients in the meeting room
    this.meetingsGateway.emitToMeeting(note.meetingId, 'note:updated', { note: updatedNote });

    return updatedNote;
  }

  async remove(id: string, userId: string) {
    const note = await this.prisma.meetingNote.findUnique({
      where: { id },
      include: { meeting: true },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Verify user has access to the meeting
    await this.verifyMeetingAccess(note.meetingId, userId);

    // Only the creator can delete their note (or admin - could be extended)
    if (note.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.prisma.meetingNote.delete({ where: { id } });

    // Broadcast to all clients in the meeting room
    this.meetingsGateway.emitToMeeting(note.meetingId, 'note:deleted', { noteId: id });

    return { message: 'Note deleted successfully' };
  }

  private async verifyMeetingAccess(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Check if user is a member of the company
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: meeting.companyId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this meeting');
    }

    return meeting;
  }
}
```

---

## Task 5: Create Meeting Notes Controller

**File:** `apps/api/src/meeting-notes/meeting-notes.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MeetingNotesService } from './meeting-notes.service';
import { CreateMeetingNoteDto, UpdateMeetingNoteDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class MeetingNotesController {
  constructor(private readonly meetingNotesService: MeetingNotesService) {}

  @Post('companies/:companyId/meetings/:meetingId/notes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('meetings.edit')
  create(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingNoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.create(meetingId, dto, userId);
  }

  @Get('companies/:companyId/meetings/:meetingId/notes')
  @RequirePermission('meetings.view')
  findAll(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.findAllByMeeting(meetingId, userId);
  }

  @Put('companies/:companyId/meetings/:meetingId/notes/:id')
  @RequirePermission('meetings.edit')
  update(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingNoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.update(id, dto, userId);
  }

  @Delete('companies/:companyId/meetings/:meetingId/notes/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('meetings.edit')
  remove(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.remove(id, userId);
  }
}
```

---

## Task 6: Create Meeting Notes Module

**File:** `apps/api/src/meeting-notes/meeting-notes.module.ts`

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { MeetingNotesController } from './meeting-notes.controller';
import { MeetingNotesService } from './meeting-notes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule)],
  controllers: [MeetingNotesController],
  providers: [MeetingNotesService],
  exports: [MeetingNotesService],
})
export class MeetingNotesModule {}
```

---

## Task 7: Register Module in AppModule

**File:** `apps/api/src/app.module.ts`

**Add import:**
```typescript
import { MeetingNotesModule } from './meeting-notes/meeting-notes.module';
```

**Add to imports array:**
```typescript
MeetingNotesModule,
```

---

## Task 8: Export MeetingsGateway from GatewayModule

**File:** `apps/api/src/gateway/gateway.module.ts`

Ensure `MeetingsGateway` is exported so it can be injected by `MeetingNotesService`:
```typescript
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [MeetingsGateway],
  exports: [MeetingsGateway],  // <-- Ensure this export exists
})
export class GatewayModule {}
```

---

## Task 9: Include Notes in Meeting Query

**File:** `apps/api/src/meetings/meetings.service.ts`

Update the `getMeeting` method to include notes in the response (around line 200-250).

Add to the include block:
```typescript
notes: {
  include: {
    createdBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
      },
    },
  },
  orderBy: {
    createdAt: 'asc',
  },
},
```

---

## Task 10: Update Frontend - Layout Changes

**File:** `apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx`

**Change the 2-column grid to full-width stacked layout (~line 651):**

**Before:**
```tsx
{/* Main Content Grid */}
<div className="grid gap-6 lg:grid-cols-2">
```

**After:**
```tsx
{/* Main Content - Full Width Stacked */}
<div className="space-y-6">
```

This makes all sections (Agenda, Decisions, Actions, Notes) full-width and stacked vertically.

---

## Task 11: Update Frontend - Notes Section with Real-time

**File:** `apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx`

Replace the existing Notes section (textarea) with a new attributed notes component.

**Add imports:**
```typescript
import { useSocket } from "@/lib/socket";
```

**Add state for notes:**
```typescript
// Notes state
const [notes, setNotes] = useState<any[]>([]);
const [newNoteContent, setNewNoteContent] = useState("");
const [isSubmittingNote, setIsSubmittingNote] = useState(false);
const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
const [editingNoteContent, setEditingNoteContent] = useState("");
const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
```

**Add socket integration:**
```typescript
const { socket, isConnected } = useSocket();

// Join meeting room and listen for note events
useEffect(() => {
  if (!socket || !isConnected || !id) return;

  // Join meeting room
  socket.emit('meeting:join', { meetingId: id });

  // Listen for note events
  socket.on('note:created', ({ note }) => {
    setNotes(prev => [...prev, note]);
  });

  socket.on('note:updated', ({ note }) => {
    setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  });

  socket.on('note:deleted', ({ noteId }) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  });

  return () => {
    socket.emit('meeting:leave', { meetingId: id });
    socket.off('note:created');
    socket.off('note:updated');
    socket.off('note:deleted');
  };
}, [socket, isConnected, id]);

// Initialize notes from meeting data
useEffect(() => {
  if (meeting?.notes) {
    setNotes(meeting.notes);
  }
}, [meeting?.notes]);
```

**Add note handlers:**
```typescript
const handleAddNote = async () => {
  if (!newNoteContent.trim() || !companyId) return;
  try {
    setIsSubmittingNote(true);
    const token = await getToken();
    const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newNoteContent.trim() }),
    });
    if (!response.ok) throw new Error("Failed to add note");
    setNewNoteContent("");
    // Note will be added via socket event
  } catch (error) {
    console.error("Error adding note:", error);
    alert("Failed to add note. Please try again.");
  } finally {
    setIsSubmittingNote(false);
  }
};

const handleUpdateNote = async () => {
  if (!editingNoteId || !editingNoteContent.trim() || !companyId) return;
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/notes/${editingNoteId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: editingNoteContent.trim() }),
    });
    if (!response.ok) throw new Error("Failed to update note");
    setEditingNoteId(null);
    setEditingNoteContent("");
    // Note will be updated via socket event
  } catch (error) {
    console.error("Error updating note:", error);
    alert("Failed to update note. Please try again.");
  }
};

const handleDeleteNote = async () => {
  if (!deletingNoteId || !companyId) return;
  try {
    const token = await getToken();
    const response = await fetch(`${API_URL}/companies/${companyId}/meetings/${id}/notes/${deletingNoteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to delete note");
    setShowDeleteNoteConfirm(false);
    setDeletingNoteId(null);
    // Note will be removed via socket event
  } catch (error) {
    console.error("Error deleting note:", error);
    alert("Failed to delete note. Please try again.");
  }
};
```

**Replace Notes Card content:**
```tsx
{/* Notes Section */}
<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-slate-100 p-2">
        <StickyNote className="h-5 w-5 text-slate-600" />
      </div>
      <div>
        <CardTitle>Meeting Notes</CardTitle>
        <CardDescription>{notes.length} note{notes.length !== 1 ? 's' : ''}</CardDescription>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* Notes list */}
    {notes.length > 0 ? (
      <div className="space-y-3 mb-4">
        {notes.map((note) => (
          <div key={note.id} className="flex items-start gap-3 rounded-lg border p-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={note.createdBy?.imageUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(note.createdBy?.firstName, note.createdBy?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {editingNoteId === note.id ? (
                <div className="flex gap-2">
                  <Input
                    value={editingNoteContent}
                    onChange={(e) => setEditingNoteContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateNote()}
                  />
                  <Button size="sm" onClick={handleUpdateNote}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <p className="text-sm">{note.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{note.createdBy?.firstName} {note.createdBy?.lastName}</span>
                    <span>•</span>
                    <span>{format(new Date(note.createdAt), "h:mm a")}</span>
                  </div>
                </>
              )}
            </div>
            {isActive && note.createdBy?.id === currentUser?.id && editingNoteId !== note.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditingNoteId(note.id);
                    setEditingNoteContent(note.content);
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setDeletingNoteId(note.id);
                      setShowDeleteNoteConfirm(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="py-4 text-center mb-4">
        <StickyNote className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No notes yet</p>
      </div>
    )}

    {/* Add note input */}
    {isActive && (
      <div className="flex gap-2">
        <Input
          placeholder="Add a note..."
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
        />
        <Button onClick={handleAddNote} disabled={isSubmittingNote || !newNoteContent.trim()}>
          {isSubmittingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    )}
  </CardContent>
</Card>

{/* Delete Note Confirmation */}
<AlertDialog open={showDeleteNoteConfirm} onOpenChange={setShowDeleteNoteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Note?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. The note will be permanently deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setDeletingNoteId(null)}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Task 12: Write API E2E Tests

**File:** `apps/api/test/meeting-notes.e2e-spec.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
} from './test-utils';

describe('MeetingNotesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompany: any;
  let testMeeting: any;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    prisma = testSetup.prisma;

    // Create test user and company
    await createTestUser(prisma);
    testCompany = await createTestCompany(prisma, TEST_USER.id);

    // Create test meeting
    testMeeting = await prisma.meeting.create({
      data: {
        companyId: testCompany.id,
        title: 'Test Meeting',
        scheduledAt: new Date(),
        duration: 60,
        status: 'IN_PROGRESS',
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.meetingNote.deleteMany({ where: { meetingId: testMeeting.id } });
    await prisma.meeting.delete({ where: { id: testMeeting.id } });
    await prisma.company.delete({ where: { id: testCompany.id } });
    await prisma.user.delete({ where: { id: TEST_USER.id } });
    await app.close();
  });

  describe('POST /companies/:companyId/meetings/:meetingId/notes', () => {
    it('should create a note', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${testCompany.id}/meetings/${testMeeting.id}/notes`)
        .send({ content: 'Test note content' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Test note content');
      expect(response.body.createdById).toBe(TEST_USER.id);
      expect(response.body.createdBy).toBeDefined();
    });

    it('should fail with empty content', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${testCompany.id}/meetings/${testMeeting.id}/notes`)
        .send({ content: '' })
        .expect(400);
    });
  });

  describe('GET /companies/:companyId/meetings/:meetingId/notes', () => {
    it('should return all notes for a meeting', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${testCompany.id}/meetings/${testMeeting.id}/notes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/notes/:id', () => {
    let noteId: string;

    beforeAll(async () => {
      const note = await prisma.meetingNote.create({
        data: {
          meetingId: testMeeting.id,
          content: 'Original content',
          createdById: TEST_USER.id,
        },
      });
      noteId = note.id;
    });

    it('should update a note', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${testCompany.id}/meetings/${testMeeting.id}/notes/${noteId}`)
        .send({ content: 'Updated content' })
        .expect(200);

      expect(response.body.content).toBe('Updated content');
    });
  });

  describe('DELETE /companies/:companyId/meetings/:meetingId/notes/:id', () => {
    let noteId: string;

    beforeAll(async () => {
      const note = await prisma.meetingNote.create({
        data: {
          meetingId: testMeeting.id,
          content: 'Note to delete',
          createdById: TEST_USER.id,
        },
      });
      noteId = note.id;
    });

    it('should delete a note', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${testCompany.id}/meetings/${testMeeting.id}/notes/${noteId}`)
        .expect(200);

      const deletedNote = await prisma.meetingNote.findUnique({ where: { id: noteId } });
      expect(deletedNote).toBeNull();
    });
  });
});
```

---

## Task 13: Write Frontend E2E Tests (Playwright)

**File:** `apps/web/e2e/meeting-notes.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Meeting Notes', () => {
  // These tests require proper authentication setup
  // Placeholder for E2E tests

  test('should display notes section in live meeting', async ({ page }) => {
    // Navigate to a live meeting
    // Verify notes section exists
    // This requires auth setup which depends on test environment
  });

  test('should add a new note', async ({ page }) => {
    // Navigate to live meeting
    // Enter note content
    // Click add button
    // Verify note appears
  });

  test('should edit a note', async ({ page }) => {
    // Navigate to live meeting with existing note
    // Click edit on note
    // Update content
    // Save
    // Verify update
  });

  test('should delete a note', async ({ page }) => {
    // Navigate to live meeting with existing note
    // Click delete
    // Confirm
    // Verify note removed
  });
});
```

---

## Task 14: Update test-utils.ts to include MeetingNotesModule

**File:** `apps/api/test/test-utils.ts`

Add import:
```typescript
import { MeetingNotesModule } from '../src/meeting-notes/meeting-notes.module';
```

Add to imports array in `createTestApp`:
```typescript
MeetingNotesModule,
```

---

## Verification Checklist

Before marking complete, verify:

1. [ ] `npx prisma db push` succeeds with new MeetingNote model
2. [ ] API server starts without errors (`npm run start:dev`)
3. [ ] Create note API works: `POST /companies/:companyId/meetings/:meetingId/notes`
4. [ ] Get notes API works: `GET /companies/:companyId/meetings/:meetingId/notes`
5. [ ] Update note API works: `PUT /companies/:companyId/meetings/:meetingId/notes/:id`
6. [ ] Delete note API works: `DELETE /companies/:companyId/meetings/:meetingId/notes/:id`
7. [ ] Notes appear in getMeeting response
8. [ ] Live meeting page shows full-width stacked layout
9. [ ] Notes section displays attributed note cards
10. [ ] Adding a note works and broadcasts to other clients
11. [ ] Editing a note works and broadcasts to other clients
12. [ ] Deleting a note works and broadcasts to other clients
13. [ ] E2E tests pass: `npm run test:e2e`
14. [ ] TypeScript compiles without errors: `npm run build`

---

## Files Modified/Created Summary

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | Modified - Add MeetingNote model |
| `apps/api/src/meeting-notes/meeting-notes.module.ts` | Created |
| `apps/api/src/meeting-notes/meeting-notes.controller.ts` | Created |
| `apps/api/src/meeting-notes/meeting-notes.service.ts` | Created |
| `apps/api/src/meeting-notes/dto/index.ts` | Created |
| `apps/api/src/meeting-notes/dto/create-meeting-note.dto.ts` | Created |
| `apps/api/src/meeting-notes/dto/update-meeting-note.dto.ts` | Created |
| `apps/api/src/app.module.ts` | Modified - Import MeetingNotesModule |
| `apps/api/src/gateway/gateway.module.ts` | Modified - Export MeetingsGateway |
| `apps/api/src/meetings/meetings.service.ts` | Modified - Include notes in getMeeting |
| `apps/api/test/test-utils.ts` | Modified - Import MeetingNotesModule |
| `apps/api/test/meeting-notes.e2e-spec.ts` | Created |
| `apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx` | Modified - Layout + Notes section |
| `apps/web/e2e/meeting-notes.spec.ts` | Created |
