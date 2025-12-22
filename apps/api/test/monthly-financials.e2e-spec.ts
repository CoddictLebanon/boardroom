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

describe('Monthly Financials API (e2e)', () => {
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
    await createTestUser(prisma, TEST_USER_2);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.monthlyFinancial.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('GET /api/v1/companies/:companyId/monthly-financials', () => {
    beforeEach(async () => {
      // Create monthly data for 2024
      await prisma.monthlyFinancial.createMany({
        data: [
          { companyId, year: 2024, month: 1, revenue: 100000, cost: 80000, profit: 20000 },
          { companyId, year: 2024, month: 2, revenue: 110000, cost: 85000, profit: 25000 },
          { companyId, year: 2024, month: 3, revenue: 120000, cost: 90000, profit: 30000 },
        ],
      });
    });

    it('should return all 12 months with data padded', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/monthly-financials`)
        .query({ year: 2024 })
        .expect(200);

      // API returns all 12 months, padded with nulls
      expect(response.body).toHaveLength(12);
      expect(response.body[0].month).toBe(1);
      expect(response.body[0].revenue).toBe(100000);
      expect(response.body[0].cost).toBe(80000);
      // Month 4 should have null values
      expect(response.body[3].month).toBe(4);
      expect(response.body[3].revenue).toBeNull();
    });

    it('should return all months with nulls for year with no data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/monthly-financials`)
        .query({ year: 2023 })
        .expect(200);

      // Returns all 12 months with null values
      expect(response.body).toHaveLength(12);
      expect(response.body[0].revenue).toBeNull();
    });
  });

  describe('PUT /api/v1/companies/:companyId/monthly-financials/:year/:month', () => {
    it('should create new monthly entry', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/monthly-financials/2024/4`)
        .send({
          revenue: 130000,
          cost: 95000,
          notes: 'Good month!',
        })
        .expect(200);

      expect(response.body.year).toBe(2024);
      expect(response.body.month).toBe(4);
      expect(response.body.revenue).toBe(130000);
    });

    it('should update existing monthly entry', async () => {
      // Create entry first
      await prisma.monthlyFinancial.create({
        data: { companyId, year: 2024, month: 5, revenue: 100000, cost: 80000, profit: 20000 },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/monthly-financials/2024/5`)
        .send({
          revenue: 150000,
          cost: 100000,
        })
        .expect(200);

      expect(response.body.revenue).toBe(150000);
    });

    it('should reject invalid month', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/monthly-financials/2024/13`)
        .send({
          revenue: 100000,
          cost: 80000,
        })
        .expect(400);
    });
  });

  describe('Access Control', () => {
    it('should deny access to non-members', async () => {
      // Create data in first company
      await prisma.monthlyFinancial.create({
        data: { companyId, year: 2024, month: 1, revenue: 100000, cost: 80000, profit: 20000 },
      });

      // Switch to non-member
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/monthly-financials`)
        .query({ year: 2024 })
        .expect(403);
    });
  });
});
