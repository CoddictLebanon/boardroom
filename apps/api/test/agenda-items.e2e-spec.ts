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

describe('AgendaItemsController (e2e)', () => {
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

    await createTestUser(prisma, TEST_USER);
    await createTestUser(prisma, TEST_USER_2);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.agendaItem.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);

    const company = await createTestCompany(prisma, TEST_USER.id);
    companyId = company.id;

    await prisma.companyMember.create({
      data: {
        userId: TEST_USER_2.id,
        companyId: companyId,
        role: 'BOARD_MEMBER',
        status: 'ACTIVE',
      },
    });

    const meeting = await prisma.meeting.create({
      data: {
        companyId: companyId,
        title: 'Test Meeting',
        scheduledAt: new Date(),
        duration: 60,
        status: 'IN_PROGRESS',
      },
    });
    meetingId = meeting.id;
  });

  describe('POST /companies/:companyId/meetings/:meetingId/agenda', () => {
    it('should create an agenda item successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'Financial Review', description: 'Review Q4 results', duration: 30 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Financial Review');
      expect(response.body.description).toBe('Review Q4 results');
      expect(response.body.duration).toBe(30);
      expect(response.body.order).toBe(0);
    });

    it('should auto-increment order for new items', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'First Item' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'Second Item' })
        .expect(201);

      expect(response.body.order).toBe(1);
    });

    it('should fail with empty title', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: '' })
        .expect(400);
    });

    it('should fail for non-member', async () => {
      mockAuthGuard.setMockUserId('non-member-id');

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'Test' })
        .expect(403);
    });
  });

  describe('GET /companies/:companyId/meetings/:meetingId/agenda', () => {
    beforeEach(async () => {
      await prisma.agendaItem.createMany({
        data: [
          { meetingId, title: 'Item A', order: 0, createdById: TEST_USER.id },
          { meetingId, title: 'Item B', order: 1, createdById: TEST_USER.id },
        ],
      });
    });

    it('should return agenda items ordered by order field', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Item A');
      expect(response.body[1].title).toBe('Item B');
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/agenda/:itemId', () => {
    let itemId: string;

    beforeEach(async () => {
      const item = await prisma.agendaItem.create({
        data: { meetingId, title: 'Original Title', order: 0, createdById: TEST_USER.id },
      });
      itemId = item.id;
    });

    it('should update an agenda item', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/${itemId}`)
        .send({ title: 'Updated Title', description: 'New description' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('New description');
    });

    it('should fail for non-existent item', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/non-existent`)
        .send({ title: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /companies/:companyId/meetings/:meetingId/agenda/:itemId', () => {
    let itemId: string;

    beforeEach(async () => {
      const item = await prisma.agendaItem.create({
        data: { meetingId, title: 'To Delete', order: 0, createdById: TEST_USER.id },
      });
      itemId = item.id;
    });

    it('should delete an agenda item', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/${itemId}`)
        .expect(200);

      const deleted = await prisma.agendaItem.findUnique({ where: { id: itemId } });
      expect(deleted).toBeNull();
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/agenda/reorder', () => {
    let itemIds: string[];

    beforeEach(async () => {
      const items = await Promise.all([
        prisma.agendaItem.create({ data: { meetingId, title: 'A', order: 0, createdById: TEST_USER.id } }),
        prisma.agendaItem.create({ data: { meetingId, title: 'B', order: 1, createdById: TEST_USER.id } }),
        prisma.agendaItem.create({ data: { meetingId, title: 'C', order: 2, createdById: TEST_USER.id } }),
      ]);
      itemIds = items.map(i => i.id);
    });

    it('should reorder agenda items', async () => {
      const newOrder = [itemIds[2], itemIds[0], itemIds[1]]; // C, A, B

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/reorder`)
        .send({ itemIds: newOrder })
        .expect(200);

      const reordered = await prisma.agendaItem.findMany({
        where: { meetingId },
        orderBy: { order: 'asc' },
      });

      expect(reordered[0].title).toBe('C');
      expect(reordered[1].title).toBe('A');
      expect(reordered[2].title).toBe('B');
    });
  });
});
