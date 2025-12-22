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

describe('Permissions API (e2e)', () => {
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
    await prisma.rolePermission.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('GET /api/v1/companies/:companyId/permissions', () => {
    it('should return company permissions matrix', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/permissions`)
        .expect(200);

      expect(response.body).toHaveProperty('allPermissions');
      expect(response.body).toHaveProperty('systemRoles');
      expect(response.body).toHaveProperty('customRoles');
    });
  });

  describe('GET /api/v1/companies/:companyId/my-permissions', () => {
    it('should return user permissions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/my-permissions`)
        .expect(200);

      // Owner should have permissions object
      expect(response.body).toHaveProperty('permissions');
      expect(Array.isArray(response.body.permissions)).toBe(true);
    });
  });

  describe('PUT /api/v1/companies/:companyId/permissions', () => {
    beforeEach(async () => {
      // Ensure permissions are seeded
      const permissionCount = await prisma.permission.count();
      if (permissionCount === 0) {
        await prisma.permission.createMany({
          data: [
            { code: 'meetings.view', area: 'meetings', action: 'view', description: 'View meetings' },
            { code: 'meetings.create', area: 'meetings', action: 'create', description: 'Create meetings' },
          ],
        });
      }
    });

    it('should update role permissions', async () => {
      const meetingsViewPerm = await prisma.permission.findFirst({
        where: { code: 'meetings.view' },
      });

      if (!meetingsViewPerm) {
        return; // Skip if no permissions seeded
      }

      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/permissions`)
        .send({
          role: 'ADMIN',
          permissions: { 'meetings.view': true },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should deny access to non-owners for updating permissions', async () => {
      // Add TEST_USER_2 as ADMIN
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
        .put(`/api/v1/companies/${companyId}/permissions`)
        .send({
          role: 'BOARD_MEMBER',
          permissions: { 'meetings.view': false },
        })
        .expect(403);
    });
  });
});
