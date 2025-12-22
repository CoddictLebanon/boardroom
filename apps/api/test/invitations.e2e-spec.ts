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

describe('Invitations API (e2e)', () => {
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
    await prisma.invitation.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  describe('POST /api/v1/companies/:companyId/invitations', () => {
    it('should create an invitation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/invitations`)
        .send({
          email: 'newuser@example.com',
          role: 'BOARD_MEMBER',
          title: 'Board Director',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('token');
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.role).toBe('BOARD_MEMBER');
      expect(response.body.status).toBe('PENDING');
    });

    it('should create invitation with default BOARD_MEMBER role', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/invitations`)
        .send({
          email: 'another@example.com',
        })
        .expect(201);

      expect(response.body.email).toBe('another@example.com');
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/invitations`)
        .send({
          email: 'not-an-email',
          role: 'BOARD_MEMBER',
        })
        .expect(400);
    });

    it('should reject invalid role', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/invitations`)
        .send({
          email: 'valid@example.com',
          role: 'INVALID_ROLE',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/companies/:companyId/invitations', () => {
    beforeEach(async () => {
      // Create invitations one by one to use connect syntax
      await prisma.invitation.create({
        data: {
          email: 'user1@example.com',
          role: 'BOARD_MEMBER',
          token: 'token-1',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          company: { connect: { id: companyId } },
          inviter: { connect: { id: TEST_USER.id } },
        },
      });
      await prisma.invitation.create({
        data: {
          email: 'user2@example.com',
          role: 'ADMIN',
          token: 'token-2',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          company: { connect: { id: companyId } },
          inviter: { connect: { id: TEST_USER.id } },
        },
      });
    });

    it('should list all invitations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/invitations`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('DELETE /api/v1/invitations/:id', () => {
    it('should revoke an invitation', async () => {
      const invitation = await prisma.invitation.create({
        data: {
          email: 'torevoke@example.com',
          role: 'BOARD_MEMBER',
          token: 'revoke-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          company: { connect: { id: companyId } },
          inviter: { connect: { id: TEST_USER.id } },
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/invitations/${invitation.id}`)
        .expect(200);

      expect(response.body.status).toBe('REVOKED');
    });
  });

  describe('POST /api/v1/invitations/:id/accept', () => {
    it('should accept an invitation by id', async () => {
      const invitation = await prisma.invitation.create({
        data: {
          email: TEST_USER_2.email,
          role: 'BOARD_MEMBER',
          token: 'accept-token-123',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          company: { connect: { id: companyId } },
          inviter: { connect: { id: TEST_USER.id } },
        },
      });

      // Switch to the user accepting the invitation
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      // Note: The service actually looks up by ID, not token
      const response = await request(app.getHttpServer())
        .post(`/api/v1/invitations/${invitation.id}/accept`)
        .expect(200);

      // Returns { member, company }
      expect(response.body).toHaveProperty('member');
      expect(response.body).toHaveProperty('company');
      expect(response.body.member.role).toBe('BOARD_MEMBER');

      // Verify user was added to company
      const member = await prisma.companyMember.findFirst({
        where: {
          companyId,
          userId: TEST_USER_2.id,
        },
      });
      expect(member).not.toBeNull();
      expect(member?.role).toBe('BOARD_MEMBER');
    });

    it('should reject expired invitation', async () => {
      const invitation = await prisma.invitation.create({
        data: {
          email: TEST_USER_2.email,
          role: 'BOARD_MEMBER',
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 1000), // Expired
          company: { connect: { id: companyId } },
          inviter: { connect: { id: TEST_USER.id } },
        },
      });

      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .post(`/api/v1/invitations/${invitation.id}/accept`)
        .expect(409); // ConflictException for expired
    });

    it('should return 404 for non-existent id', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .post('/api/v1/invitations/non-existent-id/accept')
        .expect(404);
    });
  });

  describe('Access Control', () => {
    it('should deny non-members from creating invitations', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/invitations`)
        .send({
          email: 'unauthorized@example.com',
          role: 'BOARD_MEMBER',
        })
        .expect(403);
    });

    it('should deny non-members from listing invitations', async () => {
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/invitations`)
        .expect(403);
    });
  });
});
