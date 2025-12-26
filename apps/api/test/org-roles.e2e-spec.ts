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

describe('Org Roles API (e2e)', () => {
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
    await prisma.orgRole.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);

    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  // ==========================================
  // CREATE ORG ROLE
  // ==========================================

  describe('POST /api/v1/companies/:companyId/org-roles', () => {
    it('should create a new org role', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: 'CEO',
          personName: 'John Doe',
          department: 'Executive',
          employmentType: 'FULL_TIME',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('CEO');
      expect(response.body.personName).toBe('John Doe');
      expect(response.body.department).toBe('Executive');
      expect(response.body.employmentType).toBe('FULL_TIME');
      expect(response.body.parentId).toBeNull();
      expect(response.body.positionX).toBe(0);
      expect(response.body.positionY).toBe(0);
    });

    it('should create a vacant role (no personName)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: 'CTO',
          department: 'Engineering',
        })
        .expect(201);

      expect(response.body.title).toBe('CTO');
      expect(response.body.personName).toBeNull();
    });

    it('should create a role with parent', async () => {
      // Create parent role first
      const parentResponse = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({ title: 'CEO' })
        .expect(201);

      // Create child role
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: 'CTO',
          parentId: parentResponse.body.id,
        })
        .expect(201);

      expect(response.body.parentId).toBe(parentResponse.body.id);
      expect(response.body.parent.id).toBe(parentResponse.body.id);
      expect(response.body.parent.title).toBe('CEO');
    });

    it('should reject role with missing title', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          personName: 'John Doe',
        })
        .expect(400);
    });

    it('should reject role with empty title', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: '',
        })
        .expect(400);
    });

    it('should reject role with invalid employment type', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: 'Developer',
          employmentType: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should reject role with non-existent parent', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: 'Developer',
          parentId: 'non-existent-id',
        })
        .expect(404);
    });

    it('should create roles with all employment types', async () => {
      const types = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR'];

      for (const employmentType of types) {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/org-roles`)
          .send({
            title: `Role ${employmentType}`,
            employmentType,
          })
          .expect(201);

        expect(response.body.employmentType).toBe(employmentType);
      }
    });

    it('should allow creating role with responsibilities', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({
          title: 'Tech Lead',
          responsibilities: '- Lead the engineering team\n- Code reviews\n- Architecture decisions',
        })
        .expect(201);

      expect(response.body.responsibilities).toBe('- Lead the engineering team\n- Code reviews\n- Architecture decisions');
    });
  });

  // ==========================================
  // GET ALL ORG ROLES
  // ==========================================

  describe('GET /api/v1/companies/:companyId/org-roles', () => {
    beforeEach(async () => {
      // Create some test roles
      await prisma.orgRole.create({
        data: {
          companyId,
          title: 'CEO',
          personName: 'John Doe',
        },
      });
      await prisma.orgRole.create({
        data: {
          companyId,
          title: 'CTO',
          personName: 'Jane Smith',
        },
      });
    });

    it('should return all org roles for the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((r: any) => r.title)).toContain('CEO');
      expect(response.body.map((r: any) => r.title)).toContain('CTO');
    });

    it('should include parent and children relationships', async () => {
      // Create hierarchy
      const ceo = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'CEO Root',
        },
      });
      await prisma.orgRole.create({
        data: {
          companyId,
          title: 'VP Engineering',
          parentId: ceo.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles`)
        .expect(200);

      const ceoRole = response.body.find((r: any) => r.title === 'CEO Root');
      const vpRole = response.body.find((r: any) => r.title === 'VP Engineering');

      expect(ceoRole.children).toHaveLength(1);
      expect(ceoRole.children[0].title).toBe('VP Engineering');
      expect(vpRole.parent.title).toBe('CEO Root');
    });

    it('should return empty array for company with no roles', async () => {
      // Create a new company without roles
      const newCompany = await createTestCompany(prisma, TEST_USER.id, 'Empty Company');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${newCompany.id}/org-roles`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  // ==========================================
  // GET SINGLE ORG ROLE
  // ==========================================

  describe('GET /api/v1/companies/:companyId/org-roles/:id', () => {
    it('should return a specific org role', async () => {
      const role = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Engineering Lead',
          personName: 'Alice Johnson',
          department: 'Engineering',
          employmentType: 'FULL_TIME',
          responsibilities: 'Lead the team',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles/${role.id}`)
        .expect(200);

      expect(response.body.id).toBe(role.id);
      expect(response.body.title).toBe('Engineering Lead');
      expect(response.body.personName).toBe('Alice Johnson');
      expect(response.body.department).toBe('Engineering');
      expect(response.body.employmentType).toBe('FULL_TIME');
      expect(response.body.responsibilities).toBe('Lead the team');
    });

    it('should return 404 for non-existent role', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles/non-existent-id`)
        .expect(404);
    });

    it('should include parent and children in response', async () => {
      const parent = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'CEO',
        },
      });
      const middle = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'CTO',
          parentId: parent.id,
        },
      });
      await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Developer',
          parentId: middle.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles/${middle.id}`)
        .expect(200);

      expect(response.body.parent.title).toBe('CEO');
      expect(response.body.children).toHaveLength(1);
      expect(response.body.children[0].title).toBe('Developer');
    });
  });

  // ==========================================
  // UPDATE ORG ROLE
  // ==========================================

  describe('PUT /api/v1/companies/:companyId/org-roles/:id', () => {
    let roleId: string;

    beforeEach(async () => {
      const role = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Original Title',
          personName: 'Original Name',
          department: 'Original Dept',
        },
      });
      roleId = role.id;
    });

    it('should update role title', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should update role person name', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ personName: 'New Person' })
        .expect(200);

      expect(response.body.personName).toBe('New Person');
    });

    it('should update role department', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ department: 'New Department' })
        .expect(200);

      expect(response.body.department).toBe('New Department');
    });

    it('should update role employment type', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ employmentType: 'CONTRACTOR' })
        .expect(200);

      expect(response.body.employmentType).toBe('CONTRACTOR');
    });

    it('should update role responsibilities', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ responsibilities: 'New responsibilities' })
        .expect(200);

      expect(response.body.responsibilities).toBe('New responsibilities');
    });

    it('should update position coordinates', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ positionX: 150.5, positionY: 250.75 })
        .expect(200);

      expect(response.body.positionX).toBe(150.5);
      expect(response.body.positionY).toBe(250.75);
    });

    it('should update parent role', async () => {
      const newParent = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'New Parent',
        },
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ parentId: newParent.id })
        .expect(200);

      expect(response.body.parentId).toBe(newParent.id);
      expect(response.body.parent.title).toBe('New Parent');
    });

    it('should allow clearing person name (making role vacant)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ personName: null })
        .expect(200);

      expect(response.body.personName).toBeNull();
    });

    it('should return 404 for non-existent role', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/non-existent-id`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should prevent setting role as its own parent', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ parentId: roleId })
        .expect(403);
    });

    it('should prevent circular reference (setting descendant as parent)', async () => {
      // Create hierarchy: roleId -> child -> grandchild
      const child = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Child',
          parentId: roleId,
        },
      });
      const grandchild = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Grandchild',
          parentId: child.id,
        },
      });

      // Try to set grandchild as parent of roleId (should fail)
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${roleId}`)
        .send({ parentId: grandchild.id })
        .expect(403);
    });
  });

  // ==========================================
  // DELETE ORG ROLE
  // ==========================================

  describe('DELETE /api/v1/companies/:companyId/org-roles/:id', () => {
    it('should delete an org role', async () => {
      const role = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'To Delete',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/org-roles/${role.id}`)
        .expect(200);

      const deleted = await prisma.orgRole.findUnique({
        where: { id: role.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent role', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/org-roles/non-existent-id`)
        .expect(404);
    });

    it('should move children to parent when deleting a role', async () => {
      // Create hierarchy: grandparent -> parent -> child
      const grandparent = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Grandparent',
        },
      });
      const parent = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Parent',
          parentId: grandparent.id,
        },
      });
      const child = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Child',
          parentId: parent.id,
        },
      });

      // Delete the parent
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/org-roles/${parent.id}`)
        .expect(200);

      // Child should now have grandparent as parent
      const updatedChild = await prisma.orgRole.findUnique({
        where: { id: child.id },
      });
      expect(updatedChild?.parentId).toBe(grandparent.id);
    });

    it('should set children parentId to null when deleting a root role', async () => {
      // Create hierarchy: root -> child
      const root = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Root',
        },
      });
      const child = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Child',
          parentId: root.id,
        },
      });

      // Delete the root
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/org-roles/${root.id}`)
        .expect(200);

      // Child should now be a root (parentId = null)
      const updatedChild = await prisma.orgRole.findUnique({
        where: { id: child.id },
      });
      expect(updatedChild?.parentId).toBeNull();
    });
  });

  // ==========================================
  // BATCH UPDATE POSITIONS
  // ==========================================

  describe('PUT /api/v1/companies/:companyId/org-roles/positions', () => {
    it('should update multiple role positions', async () => {
      const role1 = await prisma.orgRole.create({
        data: { companyId, title: 'Role 1' },
      });
      const role2 = await prisma.orgRole.create({
        data: { companyId, title: 'Role 2' },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/positions`)
        .send({
          positions: [
            { id: role1.id, x: 100, y: 200 },
            { id: role2.id, x: 300, y: 400 },
          ],
        })
        .expect(200);

      const updatedRole1 = await prisma.orgRole.findUnique({ where: { id: role1.id } });
      const updatedRole2 = await prisma.orgRole.findUnique({ where: { id: role2.id } });

      expect(updatedRole1?.positionX).toBe(100);
      expect(updatedRole1?.positionY).toBe(200);
      expect(updatedRole2?.positionX).toBe(300);
      expect(updatedRole2?.positionY).toBe(400);
    });

    it('should handle empty positions array', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/positions`)
        .send({ positions: [] })
        .expect(200);
    });

    it('should handle decimal position values', async () => {
      const role = await prisma.orgRole.create({
        data: { companyId, title: 'Role' },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/positions`)
        .send({
          positions: [{ id: role.id, x: 123.456, y: 789.012 }],
        })
        .expect(200);

      const updated = await prisma.orgRole.findUnique({ where: { id: role.id } });
      expect(updated?.positionX).toBe(123.456);
      expect(updated?.positionY).toBe(789.012);
    });
  });

  // ==========================================
  // HIERARCHY TESTS
  // ==========================================

  describe('Hierarchy Operations', () => {
    it('should support deep hierarchy (5+ levels)', async () => {
      let parentId: string | null = null;
      const roles: string[] = [];

      // Create 6-level hierarchy
      for (let i = 0; i < 6; i++) {
        const role = await prisma.orgRole.create({
          data: {
            companyId,
            title: `Level ${i}`,
            parentId,
          },
        });
        roles.push(role.id);
        parentId = role.id;
      }

      // Verify the hierarchy
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles`)
        .expect(200);

      expect(response.body).toHaveLength(6);

      // Check the deepest role has correct parent
      const deepest = response.body.find((r: any) => r.title === 'Level 5');
      expect(deepest.parent.title).toBe('Level 4');
    });

    it('should handle multiple root roles', async () => {
      await prisma.orgRole.create({
        data: { companyId, title: 'Root 1' },
      });
      await prisma.orgRole.create({
        data: { companyId, title: 'Root 2' },
      });
      await prisma.orgRole.create({
        data: { companyId, title: 'Root 3' },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles`)
        .expect(200);

      const rootRoles = response.body.filter((r: any) => r.parentId === null);
      expect(rootRoles).toHaveLength(3);
    });

    it('should handle re-parenting roles', async () => {
      const oldParent = await prisma.orgRole.create({
        data: { companyId, title: 'Old Parent' },
      });
      const newParent = await prisma.orgRole.create({
        data: { companyId, title: 'New Parent' },
      });
      const child = await prisma.orgRole.create({
        data: { companyId, title: 'Child', parentId: oldParent.id },
      });

      // Re-parent the child
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${child.id}`)
        .send({ parentId: newParent.id })
        .expect(200);

      expect(response.body.parentId).toBe(newParent.id);
      expect(response.body.parent.title).toBe('New Parent');
    });

    it('should handle making a child role a root role', async () => {
      const parent = await prisma.orgRole.create({
        data: { companyId, title: 'Parent' },
      });
      const child = await prisma.orgRole.create({
        data: { companyId, title: 'Child', parentId: parent.id },
      });

      // Make child a root by setting parentId to null
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${child.id}`)
        .send({ parentId: null })
        .expect(200);

      expect(response.body.parentId).toBeNull();
    });
  });

  // ==========================================
  // ACCESS CONTROL TESTS
  // ==========================================

  describe('Access Control', () => {
    it('should allow access to roles if user has access to the company', async () => {
      // Create another company - user is owner of both
      const otherCompany = await createTestCompany(prisma, TEST_USER.id, 'Other Company');

      const roleInOtherCompany = await prisma.orgRole.create({
        data: {
          companyId: otherCompany.id,
          title: 'Other Role',
        },
      });

      // User is owner of otherCompany, so they can access the role
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${otherCompany.id}/org-roles/${roleInOtherCompany.id}`)
        .expect(200);

      expect(response.body.title).toBe('Other Role');
    });

    it('should not return roles from other companies in list', async () => {
      // Create roles in main company
      await prisma.orgRole.create({
        data: { companyId, title: 'Main Company Role' },
      });

      // Create another company with a role
      const otherCompany = await createTestCompany(prisma, TEST_USER.id, 'Other Company');
      await prisma.orgRole.create({
        data: { companyId: otherCompany.id, title: 'Other Company Role' },
      });

      // Get roles for main company - should only return main company's role
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/org-roles`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Main Company Role');
    });
  });

  // ==========================================
  // DATA INTEGRITY TESTS
  // ==========================================

  describe('Data Integrity', () => {
    it('should preserve all fields when updating a single field', async () => {
      const role = await prisma.orgRole.create({
        data: {
          companyId,
          title: 'Full Role',
          personName: 'Full Name',
          department: 'Full Dept',
          responsibilities: 'Full Responsibilities',
          employmentType: 'FULL_TIME',
          positionX: 100,
          positionY: 200,
        },
      });

      // Update only title
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/org-roles/${role.id}`)
        .send({ title: 'Updated Title Only' })
        .expect(200);

      // All other fields should remain unchanged
      expect(response.body.title).toBe('Updated Title Only');
      expect(response.body.personName).toBe('Full Name');
      expect(response.body.department).toBe('Full Dept');
      expect(response.body.responsibilities).toBe('Full Responsibilities');
      expect(response.body.employmentType).toBe('FULL_TIME');
      expect(response.body.positionX).toBe(100);
      expect(response.body.positionY).toBe(200);
    });

    it('should have correct timestamps', async () => {
      const before = new Date();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/org-roles`)
        .send({ title: 'Timestamp Test' })
        .expect(201);

      const after = new Date();
      const createdAt = new Date(response.body.createdAt);
      const updatedAt = new Date(response.body.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
