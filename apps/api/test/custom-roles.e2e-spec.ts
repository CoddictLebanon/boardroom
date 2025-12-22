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

describe('Custom Roles API (e2e)', () => {
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
    await prisma.customRole.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('POST /api/v1/companies/:companyId/custom-roles', () => {
    it('should create a custom role', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/custom-roles`)
        .send({
          name: 'Legal Advisor',
          description: 'External legal counsel with limited access',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Legal Advisor');
      expect(response.body.description).toBe('External legal counsel with limited access');
    });

    it('should create a custom role without description', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/custom-roles`)
        .send({
          name: 'Auditor',
        })
        .expect(201);

      expect(response.body.name).toBe('Auditor');
    });

    it('should reject role with short name', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/custom-roles`)
        .send({
          name: 'A',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/companies/:companyId/custom-roles', () => {
    beforeEach(async () => {
      await prisma.customRole.createMany({
        data: [
          { companyId, name: 'Legal Advisor' },
          { companyId, name: 'Auditor' },
        ],
      });
    });

    it('should list all custom roles', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/custom-roles`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('should return empty array for company with no custom roles', async () => {
      await prisma.customRole.deleteMany({});

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/custom-roles`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('PUT /api/v1/custom-roles/:id', () => {
    it('should update a custom role', async () => {
      const role = await prisma.customRole.create({
        data: { companyId, name: 'Original Name' },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/custom-roles/${role.id}`)
        .send({
          name: 'Updated Name',
          description: 'New description',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.description).toBe('New description');
    });
  });

  describe('DELETE /api/v1/custom-roles/:id', () => {
    it('should delete a custom role', async () => {
      const role = await prisma.customRole.create({
        data: { companyId, name: 'To Delete' },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/custom-roles/${role.id}`)
        .expect(204);

      // Verify deletion
      const found = await prisma.customRole.findUnique({
        where: { id: role.id },
      });
      expect(found).toBeNull();
    });
  });

  describe('Access Control', () => {
    it('should deny access to non-owners', async () => {
      // Add TEST_USER_2 as ADMIN (not OWNER)
      await prisma.companyMember.create({
        data: {
          companyId,
          userId: TEST_USER_2.id,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      // Try to create custom role as non-owner
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/custom-roles`)
        .send({
          name: 'Unauthorized Role',
        })
        .expect(403);
    });

    it('should deny access to list custom roles for non-owners', async () => {
      // Add TEST_USER_2 as ADMIN (not OWNER)
      await prisma.companyMember.create({
        data: {
          companyId,
          userId: TEST_USER_2.id,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/custom-roles`)
        .expect(403);
    });
  });
});
