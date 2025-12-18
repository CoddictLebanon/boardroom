import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createTestUser,
  TEST_USER,
  TEST_USER_2,
  MockAuthGuard,
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Companies API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;

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
    // Clean companies before each test
    await prisma.company.deleteMany({});
    // Reset to default test user
    mockAuthGuard.setMockUserId(TEST_USER.id);
  });

  describe('POST /api/v1/companies', () => {
    it('should create a new company', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Acme Corp' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Acme Corp');
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0].role).toBe('OWNER');
    });

    it('should reject empty company name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: '' })
        .expect(400);
    });

    it('should reject missing company name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/companies', () => {
    it('should return empty list when user has no companies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/companies')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return companies where user is a member', async () => {
      // Create a company first
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'My Company' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/companies')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('My Company');
    });

    it('should not return companies where user is not a member', async () => {
      // Create company as TEST_USER
      await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Private Company' });

      // Switch to TEST_USER_2
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      const response = await request(app.getHttpServer())
        .get('/api/v1/companies')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/v1/companies/:id', () => {
    it('should return company details', async () => {
      // Create a company first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Test Company' });

      const companyId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}`)
        .expect(200);

      expect(response.body.name).toBe('Test Company');
      expect(response.body).toHaveProperty('members');
    });

    it('should return 404 for non-existent company', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/companies/non-existent-id')
        .expect(404);
    });

    it('should return 403 when user is not a member', async () => {
      // Create company as TEST_USER
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Private Company' });

      const companyId = createResponse.body.id;

      // Switch to TEST_USER_2
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}`)
        .expect(403);
    });
  });

  describe('PUT /api/v1/companies/:id', () => {
    it('should update company name', async () => {
      // Create a company first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Old Name' });

      const companyId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.name).toBe('New Name');
    });

    it('should reject update from non-admin member', async () => {
      // Create company as TEST_USER (owner)
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Company' });

      const companyId = createResponse.body.id;

      // Add TEST_USER_2 as regular member
      await prisma.companyMember.create({
        data: {
          companyId,
          userId: TEST_USER_2.id,
          role: 'BOARD_MEMBER',
          status: 'ACTIVE',
        },
      });

      // Switch to TEST_USER_2
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });
  });

  describe('Company Members', () => {
    let companyId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/companies')
        .send({ name: 'Member Test Company' });
      companyId = createResponse.body.id;
    });

    it('POST /companies/:id/members - should add a new member', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/members`)
        .send({
          userId: TEST_USER_2.id,
          role: 'BOARD_MEMBER',
        })
        .expect(201);

      expect(response.body.userId).toBe(TEST_USER_2.id);
      expect(response.body.role).toBe('BOARD_MEMBER');
    });

    it('PUT /companies/:id/members/:memberId - should update member role', async () => {
      // Add a member first
      const addResponse = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/members`)
        .send({
          userId: TEST_USER_2.id,
          role: 'BOARD_MEMBER',
        });

      const memberId = addResponse.body.id;

      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/members/${memberId}`)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.role).toBe('ADMIN');
    });

    it('DELETE /companies/:id/members/:memberId - should remove member', async () => {
      // Add a member first
      const addResponse = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/members`)
        .send({
          userId: TEST_USER_2.id,
          role: 'BOARD_MEMBER',
        });

      const memberId = addResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/members/${memberId}`)
        .expect(200);

      // Verify member is removed
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { members: true },
      });

      expect(company?.members).toHaveLength(1); // Only owner remains
    });
  });
});
