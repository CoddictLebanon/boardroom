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

describe('Resolutions API (e2e)', () => {
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
    await prisma.resolution.deleteMany({});
    await prisma.company.deleteMany({});

    // Reset to default test user
    mockAuthGuard.setMockUserId(TEST_USER.id);

    // Create a company for testing
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('POST /api/v1/companies/:companyId/resolutions', () => {
    it('should create a new resolution', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Approve Annual Budget',
          content: 'The Board hereby resolves to approve the annual budget for fiscal year 2025.',
          category: 'FINANCIAL',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('number'); // Auto-generated
      expect(response.body.title).toBe('Approve Annual Budget');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.category).toBe('FINANCIAL');
    });

    it('should reject resolution with missing required fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Missing Content and Category',
        })
        .expect(400);
    });

    it('should auto-generate unique resolution numbers', async () => {
      // Create first resolution
      const first = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'First Resolution',
          content: 'Content',
          category: 'GOVERNANCE',
        })
        .expect(201);

      // Create second resolution
      const second = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Second Resolution',
          content: 'Content',
          category: 'GOVERNANCE',
        })
        .expect(201);

      // Numbers should be different
      expect(first.body.number).not.toBe(second.body.number);
    });
  });

  describe('GET /api/v1/companies/:companyId/resolutions', () => {
    beforeEach(async () => {
      // Use API to create resolutions (ensures proper number generation)
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Resolution 1',
          content: 'Content 1',
          category: 'FINANCIAL',
          status: 'PASSED',
        });
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Resolution 2',
          content: 'Content 2',
          category: 'GOVERNANCE',
          status: 'DRAFT',
        });
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Resolution 3',
          content: 'Content 3',
          category: 'OPERATIONS',
          status: 'PROPOSED',
        });
    });

    it('should return all resolutions for the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/resolutions`)
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/resolutions?status=DRAFT`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('DRAFT');
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/resolutions?category=FINANCIAL`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].category).toBe('FINANCIAL');
    });
  });

  describe('GET /api/v1/resolutions/:id', () => {
    it('should return resolution details', async () => {
      const resolution = await prisma.resolution.create({
        data: {
          company: { connect: { id: companyId } },
          number: 'RES-2025-001',
          title: 'Detailed Resolution',
          content: 'Full content here',
          category: 'GOVERNANCE',
          status: 'DRAFT',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/resolutions/${resolution.id}`)
        .expect(200);

      expect(response.body.number).toBe('RES-2025-001');
      expect(response.body.title).toBe('Detailed Resolution');
      expect(response.body.content).toBe('Full content here');
    });

    it('should return 404 for non-existent resolution', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/resolutions/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/v1/resolutions/:id', () => {
    let resolutionId: string;

    beforeEach(async () => {
      const resolution = await prisma.resolution.create({
        data: {
          company: { connect: { id: companyId } },
          number: 'RES-2025-001',
          title: 'Original Title',
          content: 'Original content',
          category: 'GOVERNANCE',
          status: 'DRAFT',
        },
      });
      resolutionId = resolution.id;
    });

    it('should update resolution details', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/resolutions/${resolutionId}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content',
        })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.content).toBe('Updated content');
    });

    it('should update resolution status to PROPOSED', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/resolutions/${resolutionId}`)
        .send({ status: 'PROPOSED' })
        .expect(200);

      expect(response.body.status).toBe('PROPOSED');
    });

    it('should not allow editing PASSED resolutions', async () => {
      // Mark as passed first
      await prisma.resolution.update({
        where: { id: resolutionId },
        data: { status: 'PASSED' },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/resolutions/${resolutionId}`)
        .send({ title: 'Trying to change' })
        .expect(403); // ForbiddenException for passed resolutions
    });
  });

  describe('DELETE /api/v1/resolutions/:id', () => {
    it('should delete a draft resolution', async () => {
      const resolution = await prisma.resolution.create({
        data: {
          company: { connect: { id: companyId } },
          number: 'RES-2025-001',
          title: 'To Delete',
          content: 'Content',
          category: 'GOVERNANCE',
          status: 'DRAFT',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/resolutions/${resolution.id}`)
        .expect(200);

      // Verify deletion
      const deleted = await prisma.resolution.findUnique({
        where: { id: resolution.id },
      });
      expect(deleted).toBeNull();
    });

    it('should not allow deleting PASSED resolutions', async () => {
      const resolution = await prisma.resolution.create({
        data: {
          company: { connect: { id: companyId } },
          number: 'RES-2025-001',
          title: 'Cannot Delete',
          content: 'Content',
          category: 'GOVERNANCE',
          status: 'PASSED',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/resolutions/${resolution.id}`)
        .expect(403); // ForbiddenException for passed resolutions
    });
  });

  describe('Resolution Workflow', () => {
    it('should follow proper workflow: DRAFT -> PROPOSED -> PASSED', async () => {
      // Create as DRAFT
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/resolutions`)
        .send({
          title: 'Workflow Test',
          content: 'Testing workflow',
          category: 'GOVERNANCE',
        });

      const resolutionId = createResponse.body.id;
      expect(createResponse.body.status).toBe('DRAFT');

      // Move to PROPOSED
      const proposedResponse = await request(app.getHttpServer())
        .put(`/api/v1/resolutions/${resolutionId}`)
        .send({ status: 'PROPOSED' })
        .expect(200);

      expect(proposedResponse.body.status).toBe('PROPOSED');

      // Move to PASSED
      const passedResponse = await request(app.getHttpServer())
        .put(`/api/v1/resolutions/${resolutionId}`)
        .send({ status: 'PASSED' })
        .expect(200);

      expect(passedResponse.body.status).toBe('PASSED');
    });
  });
});
