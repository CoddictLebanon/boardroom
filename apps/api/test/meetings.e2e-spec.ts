import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
  TEST_USER_2,
  MockAuthGuard,
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Meetings API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;
  let companyId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    mockAuthGuard = testApp.mockAuthGuard;

    // Create test users
    await createTestUser(prisma, TEST_USER);
    await createTestUser(prisma, TEST_USER_2);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean data before each test
    await prisma.meeting.deleteMany({});
    await prisma.company.deleteMany({});

    // Reset to default test user
    mockAuthGuard.setMockUserId(TEST_USER.id);

    // Create a company for testing
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('POST /api/v1/companies/:companyId/meetings', () => {
    it('should create a new meeting', async () => {
      const meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + 7); // Next week

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings`)
        .send({
          title: 'Q1 Board Meeting',
          description: 'Quarterly review',
          scheduledAt: meetingDate.toISOString(),
          duration: 60,
          location: 'Conference Room A',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Q1 Board Meeting');
      expect(response.body.status).toBe('SCHEDULED');
      expect(response.body.duration).toBe(60);
    });

    it('should reject meeting with missing title', async () => {
      const meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + 7);

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings`)
        .send({
          scheduledAt: meetingDate.toISOString(),
          duration: 60,
        })
        .expect(400);
    });

    it('should reject meeting from non-member', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      const meetingDate = new Date();
      meetingDate.setDate(meetingDate.getDate() + 7);

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings`)
        .send({
          title: 'Unauthorized Meeting',
          scheduledAt: meetingDate.toISOString(),
          duration: 60,
        })
        .expect(403);
    });
  });

  describe('GET /api/v1/companies/:companyId/meetings', () => {
    beforeEach(async () => {
      // Create some meetings
      const date1 = new Date();
      date1.setDate(date1.getDate() + 7);
      const date2 = new Date();
      date2.setDate(date2.getDate() + 14);

      await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Meeting 1',
          scheduledAt: date1,
          duration: 60,
          status: 'SCHEDULED',
        },
      });
      await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Meeting 2',
          scheduledAt: date2,
          duration: 90,
          status: 'SCHEDULED',
        },
      });
    });

    it('should return all meetings for the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should filter meetings by status', async () => {
      // Mark one meeting as completed
      const meetings = await prisma.meeting.findMany({ where: { companyId } });
      await prisma.meeting.update({
        where: { id: meetings[0].id },
        data: { status: 'COMPLETED' },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings?status=SCHEDULED`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('SCHEDULED');
    });
  });

  describe('GET /api/v1/meetings/:id', () => {
    let meetingId: string;

    beforeEach(async () => {
      const meeting = await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Test Meeting',
          scheduledAt: new Date(),
          duration: 60,
          status: 'SCHEDULED',
        },
      });
      meetingId = meeting.id;
    });

    it('should return meeting details with agenda', async () => {
      // Add agenda items
      await prisma.agendaItem.create({
        data: {
          meeting: { connect: { id: meetingId } },
          title: 'Opening Remarks',
          order: 1,
        },
      });
      await prisma.agendaItem.create({
        data: {
          meeting: { connect: { id: meetingId } },
          title: 'Financial Review',
          order: 2,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/meetings/${meetingId}`)
        .expect(200);

      expect(response.body.title).toBe('Test Meeting');
      expect(response.body.agendaItems).toHaveLength(2);
    });

    it('should return 404 for non-existent meeting', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/meetings/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/v1/meetings/:id', () => {
    let meetingId: string;

    beforeEach(async () => {
      const meeting = await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Original Title',
          scheduledAt: new Date(),
          duration: 60,
          status: 'SCHEDULED',
        },
      });
      meetingId = meeting.id;
    });

    it('should update meeting details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/meetings/${meetingId}`)
        .send({
          title: 'Updated Title',
          duration: 90,
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.duration).toBe(90);
    });

    it('should update meeting status', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/meetings/${meetingId}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('DELETE /api/v1/meetings/:id', () => {
    it('should soft-delete a meeting (set status to CANCELLED)', async () => {
      const meeting = await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'To Delete',
          scheduledAt: new Date(),
          duration: 60,
          status: 'SCHEDULED',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/meetings/${meeting.id}`)
        .expect(200);

      // Verify soft deletion - status should be CANCELLED
      const deleted = await prisma.meeting.findUnique({
        where: { id: meeting.id },
      });
      expect(deleted).not.toBeNull();
      expect(deleted?.status).toBe('CANCELLED');
    });
  });

  describe('Agenda Items', () => {
    let meetingId: string;

    beforeEach(async () => {
      const meeting = await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Meeting with Agenda',
          scheduledAt: new Date(),
          duration: 60,
          status: 'SCHEDULED',
        },
      });
      meetingId = meeting.id;
    });

    it('POST /meetings/:id/agenda - should add agenda item', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/meetings/${meetingId}/agenda`)
        .send({
          title: 'New Agenda Item',
          description: 'Discussion topic',
          duration: 15,
        })
        .expect(201);

      expect(response.body.title).toBe('New Agenda Item');
      expect(response.body.order).toBe(1); // Auto-assigned
    });

    it('PUT /meetings/:id/agenda/:itemId - should update agenda item', async () => {
      const agendaItem = await prisma.agendaItem.create({
        data: {
          meeting: { connect: { id: meetingId } },
          title: 'Original',
          order: 1,
        },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/meetings/${meetingId}/agenda/${agendaItem.id}`)
        .send({ title: 'Updated', duration: 20 })
        .expect(200);

      expect(response.body.title).toBe('Updated');
      expect(response.body.duration).toBe(20);
    });
  });

  describe('Decisions and Voting', () => {
    let meetingId: string;
    let memberId: string;

    beforeEach(async () => {
      // Get the company member for the test user
      const member = await prisma.companyMember.findFirst({
        where: { userId: TEST_USER.id, companyId },
      });
      memberId = member!.id;

      // Create meeting with attendee
      const meeting = await prisma.meeting.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Voting Meeting',
          scheduledAt: new Date(),
          duration: 60,
          status: 'IN_PROGRESS', // Must be in progress for voting
          attendees: {
            create: {
              memberId: memberId,
            },
          },
        },
      });
      meetingId = meeting.id;
    });

    it('POST /meetings/:id/decisions - should create a decision', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/meetings/${meetingId}/decisions`)
        .send({
          title: 'Approve Budget',
          description: 'Vote on Q1 budget proposal',
        })
        .expect(201);

      expect(response.body.title).toBe('Approve Budget');
      expect(response.body).toHaveProperty('id');
    });

    it('POST /meetings/:id/decisions/:decisionId/vote - should cast a vote', async () => {
      const decision = await prisma.decision.create({
        data: {
          meeting: { connect: { id: meetingId } },
          title: 'Test Decision',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/meetings/${meetingId}/decisions/${decision.id}/vote`)
        .send({ vote: 'FOR' })
        .expect(201);

      expect(response.body.vote).toBe('FOR');
    });

    it('should reject voting on completed meeting', async () => {
      // Create a decision first while meeting is still IN_PROGRESS
      const decision = await prisma.decision.create({
        data: {
          meeting: { connect: { id: meetingId } },
          title: 'Late Decision',
        },
      });

      // Mark meeting as completed
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'COMPLETED' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/meetings/${meetingId}/decisions/${decision.id}/vote`)
        .send({ vote: 'FOR' })
        .expect(400);
    });
  });
});
