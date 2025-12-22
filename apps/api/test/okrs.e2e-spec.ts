import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
  MockAuthGuard,
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('OKRs API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;
  let companyId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    mockAuthGuard = testApp.mockAuthGuard;

    await createTestUser(prisma, TEST_USER);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean data before each test
    await prisma.keyResult.deleteMany({});
    await prisma.objective.deleteMany({});
    await prisma.okrPeriod.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);

    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  // ==========================================
  // OKR Periods
  // ==========================================

  describe('POST /api/v1/companies/:companyId/okr-periods', () => {
    it('should create a new OKR period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods`)
        .send({
          name: '2025 Q2 OKRs',
          startDate: '2025-04-01T00:00:00Z',
          endDate: '2025-06-30T23:59:59Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('2025 Q2 OKRs');
      expect(response.body.status).toBe('OPEN');
      expect(response.body.score).toBe(0);
      expect(response.body.objectives).toEqual([]);
    });

    it('should reject period with missing fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods`)
        .send({
          name: 'Missing dates',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/companies/:companyId/okr-periods', () => {
    beforeEach(async () => {
      await prisma.okrPeriod.create({
        data: {
          companyId,
          name: '2025 Q1 OKRs',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
        },
      });
      await prisma.okrPeriod.create({
        data: {
          companyId,
          name: '2025 Q2 OKRs',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
    });

    it('should return all OKR periods for the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      // Should be ordered by startDate desc
      expect(response.body[0].name).toBe('2025 Q2 OKRs');
    });
  });

  describe('GET /api/v1/companies/:companyId/okr-periods/:id', () => {
    it('should return a specific OKR period with details', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      expect(response.body.id).toBe(period.id);
      expect(response.body.name).toBe('Test Period');
      expect(response.body.status).toBe('OPEN');
    });

    it('should return 404 for non-existent period', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/non-existent-id`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/companies/:companyId/okr-periods/:id', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Original Name',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
    });

    it('should update period name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should update period dates', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}`)
        .send({
          startDate: '2025-05-01T00:00:00Z',
          endDate: '2025-07-31T23:59:59Z',
        })
        .expect(200);

      expect(new Date(response.body.startDate).toISOString()).toBe('2025-05-01T00:00:00.000Z');
      expect(new Date(response.body.endDate).toISOString()).toBe('2025-07-31T23:59:59.000Z');
    });

    it('should not update a closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}`)
        .send({ name: 'Trying to update' })
        .expect(403);
    });
  });

  describe('POST /api/v1/companies/:companyId/okr-periods/:id/close', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Period to close',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
    });

    it('should close an open period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/close`)
        .expect(201);

      expect(response.body.status).toBe('CLOSED');
    });

    it('should not close an already closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/close`)
        .expect(400);
    });
  });

  describe('POST /api/v1/companies/:companyId/okr-periods/:id/reopen', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Closed period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          status: 'CLOSED',
        },
      });
      periodId = period.id;
    });

    it('should reopen a closed period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/reopen`)
        .expect(201);

      expect(response.body.status).toBe('OPEN');
    });

    it('should not reopen an already open period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'OPEN' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/reopen`)
        .expect(400);
    });
  });

  describe('DELETE /api/v1/companies/:companyId/okr-periods/:id', () => {
    it('should delete an OKR period', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'To delete',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      const deleted = await prisma.okrPeriod.findUnique({
        where: { id: period.id },
      });
      expect(deleted).toBeNull();
    });

    it('should cascade delete objectives and key results', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'To delete',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });

      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'Test KR',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      // Verify cascade deletion
      const deletedObjective = await prisma.objective.findUnique({
        where: { id: objective.id },
      });
      expect(deletedObjective).toBeNull();
    });
  });

  // ==========================================
  // Objectives
  // ==========================================

  describe('POST /api/v1/companies/:companyId/okr-periods/:periodId/objectives', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
    });

    it('should create a new objective', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives`)
        .send({
          title: 'Mitigate PPC Risk',
          order: 0,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Mitigate PPC Risk');
      expect(response.body.progress).toBe(0);
    });

    it('should reject objective with missing title', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives`)
        .send({
          order: 0,
        })
        .expect(400);
    });

    it('should not create objective in closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives`)
        .send({ title: 'New objective' })
        .expect(403);
    });

    it('should create multiple objectives with different orders', async () => {
      const obj1 = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives`)
        .send({ title: 'First Objective', order: 0 })
        .expect(201);

      const obj2 = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives`)
        .send({ title: 'Second Objective', order: 1 })
        .expect(201);

      expect(obj1.body.order).toBe(0);
      expect(obj2.body.order).toBe(1);
    });
  });

  describe('PATCH /api/v1/companies/:companyId/okr-periods/:periodId/objectives/:id', () => {
    let objectiveId: string;
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Original Title',
        },
      });
      objectiveId = objective.id;
    });

    it('should update objective title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should update objective order', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}`)
        .send({ order: 5 })
        .expect(200);

      expect(response.body.order).toBe(5);
    });

    it('should not update objective in closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}`)
        .send({ title: 'Trying to update' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/companies/:companyId/okr-periods/:periodId/objectives/:id', () => {
    it('should delete an objective', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'To delete',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}/objectives/${objective.id}`)
        .expect(200);

      const deleted = await prisma.objective.findUnique({
        where: { id: objective.id },
      });
      expect(deleted).toBeNull();
    });

    it('should cascade delete key results', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'To delete',
        },
      });
      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR to cascade delete',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}/objectives/${objective.id}`)
        .expect(200);

      const deletedKR = await prisma.keyResult.findUnique({
        where: { id: keyResult.id },
      });
      expect(deletedKR).toBeNull();
    });

    it('should not delete objective in closed period', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          status: 'CLOSED',
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Cannot delete',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}/objectives/${objective.id}`)
        .expect(403);
    });
  });

  // ==========================================
  // Key Results
  // ==========================================

  describe('POST /api/v1/companies/:companyId/okr-periods/:periodId/objectives/:objectiveId/key-results', () => {
    let objectiveId: string;
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      objectiveId = objective.id;
    });

    it('should create a new key result', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Acquire 40,000 Customers',
          metricType: 'NUMERIC',
          startValue: 30000,
          targetValue: 40000,
          currentValue: 30000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Acquire 40,000 Customers');
      expect(response.body.progress).toBe(0);
    });

    it('should reject key result with missing fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Missing values',
        })
        .expect(400);
    });

    it('should calculate progress correctly', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Generate Revenue',
          startValue: 50000,
          targetValue: 75000,
          currentValue: 71000,
        })
        .expect(201);

      // (71000 - 50000) / (75000 - 50000) * 100 = 84%
      expect(response.body.progress).toBe(84);
    });

    it('should handle inverse metrics', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Reduce Churn',
          startValue: 10,
          targetValue: 5,
          currentValue: 7,
          inverse: true,
        })
        .expect(201);

      // (10 - 7) / (10 - 5) * 100 = 60%
      expect(response.body.progress).toBe(60);
    });

    it('should cap progress at 100%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Exceeded Target',
          startValue: 0,
          targetValue: 100,
          currentValue: 150,
        })
        .expect(201);

      expect(response.body.progress).toBe(100);
    });

    it('should not go below 0%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Negative Progress',
          startValue: 100,
          targetValue: 200,
          currentValue: 50,
        })
        .expect(201);

      expect(response.body.progress).toBe(0);
    });

    it('should handle boolean metrics', async () => {
      const responseNotDone = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Launch Feature',
          metricType: 'BOOLEAN',
          startValue: 0,
          targetValue: 1,
          currentValue: 0,
        })
        .expect(201);

      expect(responseNotDone.body.progress).toBe(0);

      const responseDone = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Another Feature',
          metricType: 'BOOLEAN',
          startValue: 0,
          targetValue: 1,
          currentValue: 1,
        })
        .expect(201);

      expect(responseDone.body.progress).toBe(100);
    });

    it('should handle percentage metrics', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Increase Conversion Rate',
          metricType: 'PERCENTAGE',
          startValue: 2.5,
          targetValue: 5.0,
          currentValue: 3.75,
        })
        .expect(201);

      // (3.75 - 2.5) / (5.0 - 2.5) * 100 = 50%
      expect(response.body.progress).toBe(50);
    });

    it('should handle currency metrics', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Monthly Recurring Revenue',
          metricType: 'CURRENCY',
          startValue: 10000,
          targetValue: 15000,
          currentValue: 12500,
        })
        .expect(201);

      // (12500 - 10000) / (15000 - 10000) * 100 = 50%
      expect(response.body.progress).toBe(50);
    });

    it('should not create key result in closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Should fail',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/companies/:companyId/okr-periods/:periodId/objectives/:objectiveId/key-results/:id', () => {
    let keyResultId: string;
    let periodId: string;
    let objectiveId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      objectiveId = objective.id;
      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'Original KR',
          startValue: 0,
          targetValue: 100,
          currentValue: 50,
        },
      });
      keyResultId = keyResult.id;
    });

    it('should update current value', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .send({ currentValue: 75 })
        .expect(200);

      expect(Number(response.body.currentValue)).toBe(75);
      expect(response.body.progress).toBe(75);
    });

    it('should update comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .send({ comment: 'On track!' })
        .expect(200);

      expect(response.body.comment).toBe('On track!');
    });

    it('should update title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .send({ title: 'Updated KR Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated KR Title');
    });

    it('should recalculate progress when current value is updated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .send({ currentValue: 25 })
        .expect(200);

      expect(Number(response.body.currentValue)).toBe(25);
      expect(response.body.progress).toBe(25);
    });

    it('should not update key result in closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .send({ currentValue: 75 })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/companies/:companyId/okr-periods/:periodId/objectives/:objectiveId/key-results/:id', () => {
    it('should delete a key result', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'To delete',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}/objectives/${objective.id}/key-results/${keyResult.id}`)
        .expect(200);

      const deleted = await prisma.keyResult.findUnique({
        where: { id: keyResult.id },
      });
      expect(deleted).toBeNull();
    });

    it('should not delete key result in closed period', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          status: 'CLOSED',
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'Cannot delete',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}/objectives/${objective.id}/key-results/${keyResult.id}`)
        .expect(403);
    });
  });

  // ==========================================
  // Progress Aggregation
  // ==========================================

  describe('Progress Aggregation', () => {
    it('should calculate objective progress as average of key results', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });

      // Create KR with 0% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 1',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      // Create KR with 100% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 2',
          startValue: 0,
          targetValue: 100,
          currentValue: 100,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      // Average: (0 + 100) / 2 = 50%
      expect(response.body.objectives[0].progress).toBe(50);
    });

    it('should calculate period score as average of objectives', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      // Objective 1 with 100% progress
      const obj1 = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Objective 1',
        },
      });
      await prisma.keyResult.create({
        data: {
          objectiveId: obj1.id,
          title: 'KR 1',
          startValue: 0,
          targetValue: 100,
          currentValue: 100,
        },
      });

      // Objective 2 with 0% progress
      const obj2 = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Objective 2',
        },
      });
      await prisma.keyResult.create({
        data: {
          objectiveId: obj2.id,
          title: 'KR 2',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      // Average: (100 + 0) / 2 = 50%
      expect(response.body.score).toBe(50);
    });

    it('should handle objectives with no key results (0% progress)', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Empty Objective',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      expect(response.body.objectives[0].progress).toBe(0);
      expect(response.body.score).toBe(0);
    });

    it('should handle multiple key results with varying progress', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });

      // 25% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 1',
          startValue: 0,
          targetValue: 100,
          currentValue: 25,
        },
      });

      // 50% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 2',
          startValue: 0,
          targetValue: 100,
          currentValue: 50,
        },
      });

      // 75% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 3',
          startValue: 0,
          targetValue: 100,
          currentValue: 75,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      // Average: (25 + 50 + 75) / 3 = 50%
      expect(response.body.objectives[0].progress).toBe(50);
    });
  });

  // ==========================================
  // Closed Period Restrictions
  // ==========================================

  describe('Closed Period Restrictions', () => {
    let closedPeriodId: string;
    let objectiveId: string;
    let keyResultId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Closed Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          status: 'CLOSED',
        },
      });
      closedPeriodId = period.id;

      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      objectiveId = objective.id;

      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'Test KR',
          startValue: 0,
          targetValue: 100,
          currentValue: 50,
        },
      });
      keyResultId = keyResult.id;
    });

    it('should prevent updating closed period', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}`)
        .send({ name: 'New Name' })
        .expect(403);
    });

    it('should prevent creating objectives in closed period', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives`)
        .send({ title: 'New Objective' })
        .expect(403);
    });

    it('should prevent updating objectives in closed period', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives/${objectiveId}`)
        .send({ title: 'Updated Title' })
        .expect(403);
    });

    it('should prevent deleting objectives in closed period', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives/${objectiveId}`)
        .expect(403);
    });

    it('should prevent creating key results in closed period', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives/${objectiveId}/key-results`)
        .send({
          title: 'New KR',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        })
        .expect(403);
    });

    it('should prevent updating key results in closed period', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .send({ currentValue: 75 })
        .expect(403);
    });

    it('should prevent deleting key results in closed period', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives/${objectiveId}/key-results/${keyResultId}`)
        .expect(403);
    });

    it('should allow reopening a closed period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/reopen`)
        .expect(201);

      expect(response.body.status).toBe('OPEN');

      // Should now allow updates
      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${closedPeriodId}/objectives/${objectiveId}`)
        .send({ title: 'Updated After Reopen' })
        .expect(200);
    });
  });
});
