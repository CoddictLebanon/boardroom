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

describe('Financial Reports API (e2e)', () => {
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
    await prisma.financialReport.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('POST /api/v1/companies/:companyId/financial-reports', () => {
    it('should create a financial report with data', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/financial-reports`)
        .send({
          type: 'PROFIT_LOSS',
          fiscalYear: 2024,
          period: 'Q1',
          data: {
            revenue: 100000,
            expenses: 75000,
            netIncome: 25000,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('PROFIT_LOSS');
      expect(response.body.fiscalYear).toBe(2024);
      expect(response.body.period).toBe('Q1');
      expect(response.body.status).toBe('DRAFT');
    });

    it('should create a financial report with storageKey', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/financial-reports`)
        .send({
          type: 'BALANCE_SHEET',
          fiscalYear: 2024,
          period: 'Annual',
          storageKey: 'reports/balance-sheet-2024.pdf',
        })
        .expect(201);

      expect(response.body.type).toBe('BALANCE_SHEET');
      expect(response.body.storageKey).toBe('reports/balance-sheet-2024.pdf');
    });

    it('should reject report with missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/financial-reports`)
        .send({
          type: 'PROFIT_LOSS',
          // Missing fiscalYear and period
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/companies/:companyId/financial-reports', () => {
    beforeEach(async () => {
      // Create some reports
      await prisma.financialReport.createMany({
        data: [
          {
            companyId,
            type: 'PROFIT_LOSS',
            fiscalYear: 2024,
            period: 'Q1',
            data: { revenue: 100000 },
            status: 'DRAFT',
          },
          {
            companyId,
            type: 'BALANCE_SHEET',
            fiscalYear: 2024,
            period: 'Q1',
            data: { assets: 500000 },
            status: 'FINAL',
          },
          {
            companyId,
            type: 'PROFIT_LOSS',
            fiscalYear: 2023,
            period: 'Annual',
            data: { revenue: 400000 },
            status: 'FINAL',
          },
        ],
      });
    });

    it('should list all financial reports for a company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/financial-reports`)
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/financial-reports`)
        .query({ type: 'PROFIT_LOSS' })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((r: any) => r.type === 'PROFIT_LOSS')).toBe(true);
    });

    it('should filter by fiscal year', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/financial-reports`)
        .query({ fiscalYear: '2024' })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((r: any) => r.fiscalYear === 2024)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/financial-reports`)
        .query({ status: 'FINAL' })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((r: any) => r.status === 'FINAL')).toBe(true);
    });
  });

  describe('GET /api/v1/financial-reports/:id', () => {
    it('should get report details', async () => {
      const report = await prisma.financialReport.create({
        data: {
          companyId,
          type: 'CASH_FLOW',
          fiscalYear: 2024,
          period: 'Q2',
          data: { operatingCashFlow: 50000 },
          status: 'DRAFT',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/financial-reports/${report.id}`)
        .expect(200);

      expect(response.body.type).toBe('CASH_FLOW');
      expect(response.body.period).toBe('Q2');
    });

    it('should return 404 for non-existent report', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/financial-reports/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/v1/financial-reports/:id', () => {
    it('should update report data', async () => {
      const report = await prisma.financialReport.create({
        data: {
          companyId,
          type: 'PROFIT_LOSS',
          fiscalYear: 2024,
          period: 'Q1',
          data: { revenue: 100000 },
          status: 'DRAFT',
        },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/financial-reports/${report.id}`)
        .send({
          data: { revenue: 120000, expenses: 80000 },
        })
        .expect(200);

      expect(response.body.data.revenue).toBe(120000);
    });
  });

  describe('PUT /api/v1/financial-reports/:id/finalize', () => {
    it('should finalize a draft report', async () => {
      const report = await prisma.financialReport.create({
        data: {
          companyId,
          type: 'PROFIT_LOSS',
          fiscalYear: 2024,
          period: 'Q3',
          data: { revenue: 150000 },
          status: 'DRAFT',
        },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/financial-reports/${report.id}/finalize`)
        .expect(200);

      expect(response.body.status).toBe('FINAL');
    });
  });

  describe('DELETE /api/v1/financial-reports/:id', () => {
    it('should delete a report', async () => {
      const report = await prisma.financialReport.create({
        data: {
          companyId,
          type: 'PROFIT_LOSS',
          fiscalYear: 2024,
          period: 'Q4',
          data: { revenue: 200000 },
          status: 'DRAFT',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/financial-reports/${report.id}`)
        .expect(204);

      // Verify deletion
      const found = await prisma.financialReport.findUnique({
        where: { id: report.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Access Control', () => {
    it('should not return reports from other companies', async () => {
      // Create report in first company
      await prisma.financialReport.create({
        data: {
          companyId,
          type: 'PROFIT_LOSS',
          fiscalYear: 2024,
          period: 'Q1',
          data: { revenue: 100000 },
          status: 'DRAFT',
        },
      });

      // Create second company
      const company2 = await createTestCompany(prisma, TEST_USER_2.id, 'Other Company');

      // Switch user and query other company
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${company2.id}/financial-reports`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });
});
