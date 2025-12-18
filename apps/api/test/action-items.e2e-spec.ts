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

describe('Action Items API (e2e)', () => {
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
    await prisma.actionItem.deleteMany({});
    await prisma.company.deleteMany({});

    // Reset to default test user
    mockAuthGuard.setMockUserId(TEST_USER.id);

    // Create a company for testing
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('POST /api/v1/companies/:companyId/action-items', () => {
    it('should create a new action item', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/action-items`)
        .send({
          title: 'Review financial report',
          description: 'Complete Q1 review',
          dueDate: dueDate.toISOString(),
          priority: 'HIGH',
          assigneeId: TEST_USER.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Review financial report');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.priority).toBe('HIGH');
    });

    it('should create action item without assignee', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/action-items`)
        .send({
          title: 'Unassigned Task',
          priority: 'MEDIUM',
        })
        .expect(201);

      expect(response.body.title).toBe('Unassigned Task');
      expect(response.body.assigneeId).toBeNull();
    });

    it('should reject action item with missing title', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/action-items`)
        .send({
          description: 'No title provided',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/companies/:companyId/action-items', () => {
    beforeEach(async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      // Create action items using individual creates for proper relation handling
      await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Task 1',
          status: 'PENDING',
          priority: 'HIGH',
          dueDate,
        },
      });
      await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Task 2',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
        },
      });
      await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Task 3',
          status: 'COMPLETED',
          priority: 'LOW',
        },
      });
    });

    it('should return all action items for the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/action-items`)
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/action-items?status=PENDING`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('PENDING');
    });

    it('should filter by priority', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/action-items?priority=HIGH`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].priority).toBe('HIGH');
    });
  });

  describe('GET /api/v1/action-items/my', () => {
    beforeEach(async () => {
      // Create action items assigned to TEST_USER
      await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          assignee: { connect: { id: TEST_USER.id } },
          title: 'My Task 1',
          status: 'PENDING',
          priority: 'HIGH',
        },
      });
      await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          assignee: { connect: { id: TEST_USER.id } },
          title: 'My Task 2',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
        },
      });
      await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          assignee: { connect: { id: TEST_USER_2.id } },
          title: 'Other Task',
          status: 'PENDING',
          priority: 'LOW',
        },
      });
    });

    it('should return only action items assigned to current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/action-items/my')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((item: any) => item.assigneeId === TEST_USER.id)).toBe(true);
    });
  });

  describe('GET /api/v1/action-items/:id', () => {
    it('should return action item details', async () => {
      const actionItem = await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Detailed Task',
          description: 'Full description here',
          status: 'PENDING',
          priority: 'HIGH',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/action-items/${actionItem.id}`)
        .expect(200);

      expect(response.body.title).toBe('Detailed Task');
      expect(response.body.description).toBe('Full description here');
    });

    it('should return 404 for non-existent action item', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/action-items/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/v1/action-items/:id', () => {
    let actionItemId: string;

    beforeEach(async () => {
      const actionItem = await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Original Title',
          status: 'PENDING',
          priority: 'MEDIUM',
        },
      });
      actionItemId = actionItem.id;
    });

    it('should update action item details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/action-items/${actionItemId}`)
        .send({
          title: 'Updated Title',
          priority: 'HIGH',
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.priority).toBe('HIGH');
    });

    it('should assign action item to user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/action-items/${actionItemId}`)
        .send({ assigneeId: TEST_USER.id })
        .expect(200);

      expect(response.body.assigneeId).toBe(TEST_USER.id);
    });
  });

  describe('PUT /api/v1/action-items/:id/status', () => {
    let actionItemId: string;

    beforeEach(async () => {
      const actionItem = await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'Status Test Task',
          status: 'PENDING',
          priority: 'MEDIUM',
        },
      });
      actionItemId = actionItem.id;
    });

    it('should update status to IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/action-items/${actionItemId}/status`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('should update status to COMPLETED', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/action-items/${actionItemId}/status`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
    });

    it('should reject invalid status', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/action-items/${actionItemId}/status`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/action-items/:id', () => {
    it('should delete an action item', async () => {
      const actionItem = await prisma.actionItem.create({
        data: {
          company: { connect: { id: companyId } },
          title: 'To Delete',
          status: 'PENDING',
          priority: 'LOW',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/action-items/${actionItem.id}`)
        .expect(200);

      // Verify deletion
      const deleted = await prisma.actionItem.findUnique({
        where: { id: actionItem.id },
      });
      expect(deleted).toBeNull();
    });
  });
});
