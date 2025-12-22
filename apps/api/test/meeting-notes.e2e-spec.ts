import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
  TEST_USER_2,
  MockAuthGuard,
} from './test-utils';

describe('MeetingNotesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;
  let companyId: string;
  let meetingId: string;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    prisma = testSetup.prisma;
    mockAuthGuard = testSetup.mockAuthGuard;

    // Create test users
    await createTestUser(prisma, TEST_USER);
    await createTestUser(prisma, TEST_USER_2);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean data before each test
    await prisma.meetingNote.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.company.deleteMany({});

    // Reset to default test user
    mockAuthGuard.setMockUserId(TEST_USER.id);

    // Create test company with TEST_USER as owner
    const company = await createTestCompany(prisma, TEST_USER.id);
    companyId = company.id;

    // Add TEST_USER_2 as a member
    await prisma.companyMember.create({
      data: {
        userId: TEST_USER_2.id,
        companyId: companyId,
        role: 'BOARD_MEMBER',
        status: 'ACTIVE',
      },
    });

    // Create test meeting
    const meeting = await prisma.meeting.create({
      data: {
        companyId: companyId,
        title: 'Test Meeting for Notes',
        scheduledAt: new Date(),
        duration: 60,
        status: 'IN_PROGRESS',
      },
    });
    meetingId = meeting.id;
  });

  describe('POST /companies/:companyId/meetings/:meetingId/notes', () => {
    it('should create a note successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes`)
        .send({ content: 'Test note content' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Test note content');
      expect(response.body.createdById).toBe(TEST_USER.id);
      expect(response.body.createdBy).toBeDefined();
      expect(response.body.createdBy.firstName).toBe(TEST_USER.firstName);
    });

    it('should fail with empty content', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes`)
        .send({ content: '' })
        .expect(400);
    });

    it('should fail without content field', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes`)
        .send({})
        .expect(400);
    });

    it('should fail for non-existent meeting', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/non-existent-id/notes`)
        .send({ content: 'Test note' })
        .expect(404);
    });

    it('should allow any company member to create a note', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes`)
        .send({ content: 'Note from member' })
        .expect(201);

      expect(response.body.createdById).toBe(TEST_USER_2.id);
    });
  });

  describe('GET /companies/:companyId/meetings/:meetingId/notes', () => {
    beforeEach(async () => {
      // Create some test notes
      await prisma.meetingNote.createMany({
        data: [
          {
            meetingId: meetingId,
            content: 'First note',
            createdById: TEST_USER.id,
            order: 0,
          },
          {
            meetingId: meetingId,
            content: 'Second note',
            createdById: TEST_USER_2.id,
            order: 1,
          },
        ],
      });
    });

    it('should return all notes for a meeting', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      // Notes should include createdBy information
      expect(response.body[0].createdBy).toBeDefined();
    });

    it('should return notes ordered by order field', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes`)
        .expect(200);

      // Check that notes are ordered correctly
      expect(response.body[0].content).toBe('First note');
      expect(response.body[1].content).toBe('Second note');
    });

    it('should fail for non-existent meeting', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings/non-existent-id/notes`)
        .expect(404);
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/notes/:noteId', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.meetingNote.create({
        data: {
          meetingId: meetingId,
          content: 'Original content',
          createdById: TEST_USER.id,
          order: 0,
        },
      });
      noteId = note.id;
    });

    it('should update a note by its creator', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/${noteId}`)
        .send({ content: 'Updated content' })
        .expect(200);

      expect(response.body.content).toBe('Updated content');
      expect(response.body.id).toBe(noteId);
    });

    it('should fail when another user tries to update', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/${noteId}`)
        .send({ content: 'Attempted update' })
        .expect(403);
    });

    it('should fail for non-existent note', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/non-existent-id`)
        .send({ content: 'Updated content' })
        .expect(404);
    });

    it('should fail with empty content', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/${noteId}`)
        .send({ content: '' })
        .expect(400);
    });
  });

  describe('DELETE /companies/:companyId/meetings/:meetingId/notes/:noteId', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.meetingNote.create({
        data: {
          meetingId: meetingId,
          content: 'Note to delete',
          createdById: TEST_USER.id,
          order: 0,
        },
      });
      noteId = note.id;
    });

    it('should delete a note by its creator', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/${noteId}`)
        .expect(200);

      const deletedNote = await prisma.meetingNote.findUnique({
        where: { id: noteId },
      });
      expect(deletedNote).toBeNull();
    });

    it('should fail when another user tries to delete', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/${noteId}`)
        .expect(403);

      // Verify note still exists
      const note = await prisma.meetingNote.findUnique({
        where: { id: noteId },
      });
      expect(note).not.toBeNull();
    });

    it('should fail for non-existent note', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/non-existent-id`)
        .expect(404);
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/notes/reorder', () => {
    let noteIds: string[];

    beforeEach(async () => {
      // Create notes for reorder testing
      const notes = await Promise.all([
        prisma.meetingNote.create({
          data: {
            meetingId: meetingId,
            content: 'Note A',
            createdById: TEST_USER.id,
            order: 0,
          },
        }),
        prisma.meetingNote.create({
          data: {
            meetingId: meetingId,
            content: 'Note B',
            createdById: TEST_USER.id,
            order: 1,
          },
        }),
        prisma.meetingNote.create({
          data: {
            meetingId: meetingId,
            content: 'Note C',
            createdById: TEST_USER.id,
            order: 2,
          },
        }),
      ]);
      noteIds = notes.map(n => n.id);
    });

    it('should reorder notes successfully', async () => {
      // Reverse the order: C, B, A
      const newOrder = [noteIds[2], noteIds[1], noteIds[0]];

      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/reorder`)
        .send({ noteIds: newOrder })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify the order was updated in the database
      const updatedNotes = await prisma.meetingNote.findMany({
        where: { id: { in: noteIds } },
        orderBy: { order: 'asc' },
      });

      expect(updatedNotes[0].id).toBe(noteIds[2]); // Note C is now first
      expect(updatedNotes[1].id).toBe(noteIds[1]); // Note B is now second
      expect(updatedNotes[2].id).toBe(noteIds[0]); // Note A is now third
    });

    it('should allow any member to reorder notes', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      const newOrder = [noteIds[1], noteIds[0], noteIds[2]];

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/notes/reorder`)
        .send({ noteIds: newOrder })
        .expect(200);
    });
  });
});
