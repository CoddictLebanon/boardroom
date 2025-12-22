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

describe('Documents API (e2e)', () => {
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
    await prisma.documentTag.deleteMany({});
    await prisma.documentVersion.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.folder.deleteMany({});
    await prisma.company.deleteMany({});

    // Reset to default test user
    mockAuthGuard.setMockUserId(TEST_USER.id);

    // Create a company for testing
    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  // Helper to create a document directly in DB (bypasses file upload)
  async function createTestDocument(name: string, type: string = 'GENERAL', folderId?: string) {
    const storageKey = `test/${name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    return prisma.document.create({
      data: {
        name,
        type: type as any,
        companyId,
        uploaderId: TEST_USER.id,
        storageKey,
        size: 1024,
        mimeType: 'application/pdf',
        folderId,
        versions: {
          create: {
            version: 1,
            storageKey,
            size: 1024,
            uploaderId: TEST_USER.id,
          },
        },
      },
      include: {
        versions: true,
        tags: true,
      },
    });
  }

  // ==========================================
  // FOLDERS
  // ==========================================

  describe('Folders', () => {
    describe('POST /api/v1/companies/:companyId/folders', () => {
      it('should create a new folder', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({
            name: 'Board Documents',
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Board Documents');
      });

      it('should create a nested folder', async () => {
        // Create parent folder first
        const parentResponse = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({ name: 'Parent Folder' });

        const parentId = parentResponse.body.id;

        // Create child folder
        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({
            name: 'Child Folder',
            parentId,
          })
          .expect(201);

        expect(response.body.parentId).toBe(parentId);
      });

      it('should reject folder with missing name', async () => {
        await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({ description: 'No name provided' })
          .expect(400);
      });
    });

    describe('GET /api/v1/companies/:companyId/folders', () => {
      it('should return all folders for a company', async () => {
        // Create some folders
        await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({ name: 'Folder 1' });
        await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({ name: 'Folder 2' });

        const response = await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/folders`)
          .expect(200);

        expect(response.body).toHaveLength(2);
      });

      it('should return empty array when no folders exist', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/folders`)
          .expect(200);

        expect(response.body).toEqual([]);
      });
    });

    describe('PUT /api/v1/companies/:companyId/folders/:id', () => {
      it('should update a folder', async () => {
        // Create folder first
        const createResponse = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({ name: 'Original Name' });

        const folderId = createResponse.body.id;

        const response = await request(app.getHttpServer())
          .put(`/api/v1/companies/${companyId}/folders/${folderId}`)
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.name).toBe('Updated Name');
      });
    });

    describe('DELETE /api/v1/companies/:companyId/folders/:id', () => {
      it('should delete a folder', async () => {
        // Create folder first
        const createResponse = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/folders`)
          .send({ name: 'To Delete' });

        const folderId = createResponse.body.id;

        await request(app.getHttpServer())
          .delete(`/api/v1/companies/${companyId}/folders/${folderId}`)
          .expect(200);

        // Verify folder is deleted
        const folders = await prisma.folder.findMany({
          where: { id: folderId },
        });
        expect(folders).toHaveLength(0);
      });
    });
  });

  // ==========================================
  // DOCUMENTS (using DB helper to create documents)
  // ==========================================

  describe('Documents', () => {
    describe('GET /api/v1/companies/:companyId/documents', () => {
      beforeEach(async () => {
        // Create some documents directly in DB
        await createTestDocument('Document 1', 'GENERAL');
        await createTestDocument('Document 2', 'MEETING');
      });

      it('should list all documents', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/documents`)
          .expect(200);

        expect(response.body).toHaveLength(2);
      });

      it('should filter documents by type', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/documents`)
          .query({ type: 'MEETING' })
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].type).toBe('MEETING');
      });
    });

    describe('GET /api/v1/companies/:companyId/documents/:id', () => {
      it('should get document details', async () => {
        const doc = await createTestDocument('Detail Test', 'FINANCIAL');

        const response = await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/documents/${doc.id}`)
          .expect(200);

        expect(response.body.name).toBe('Detail Test');
        expect(response.body).toHaveProperty('versions');
      });

      it('should return 404 for non-existent document', async () => {
        await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/documents/non-existent-id`)
          .expect(404);
      });
    });

    describe('PUT /api/v1/companies/:companyId/documents/:id', () => {
      it('should update document metadata', async () => {
        const doc = await createTestDocument('Original Name', 'GENERAL');

        const response = await request(app.getHttpServer())
          .put(`/api/v1/companies/${companyId}/documents/${doc.id}`)
          .send({
            name: 'Updated Name',
            description: 'Updated description',
          })
          .expect(200);

        expect(response.body.name).toBe('Updated Name');
        expect(response.body.description).toBe('Updated description');
      });
    });

    describe('DELETE /api/v1/companies/:companyId/documents/:id', () => {
      it('should delete a document', async () => {
        const doc = await createTestDocument('To Delete', 'GENERAL');

        await request(app.getHttpServer())
          .delete(`/api/v1/companies/${companyId}/documents/${doc.id}`)
          .expect(200);

        // Verify document is deleted
        const docs = await prisma.document.findMany({
          where: { id: doc.id },
        });
        expect(docs).toHaveLength(0);
      });
    });
  });

  // ==========================================
  // TAGS
  // ==========================================

  describe('Tags', () => {
    let documentId: string;

    beforeEach(async () => {
      const doc = await createTestDocument('Tag Test Doc', 'GENERAL');
      documentId = doc.id;
    });

    describe('POST /api/v1/companies/:companyId/documents/:id/tags', () => {
      it('should add tags to a document', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/documents/${documentId}/tags`)
          .send({ tags: ['important', 'financial', 'q1'] })
          .expect(201);

        expect(response.body.tags).toHaveLength(3);
        expect(response.body.tags.map((t: any) => t.tag)).toContain('important');
      });
    });

    describe('DELETE /api/v1/companies/:companyId/documents/:id/tags/:tag', () => {
      it('should remove a tag from a document', async () => {
        // Add tags first
        await request(app.getHttpServer())
          .post(`/api/v1/companies/${companyId}/documents/${documentId}/tags`)
          .send({ tags: ['to-remove', 'keep'] });

        // Remove one tag
        await request(app.getHttpServer())
          .delete(`/api/v1/companies/${companyId}/documents/${documentId}/tags/to-remove`)
          .expect(200);

        // Verify tag is removed
        const docResponse = await request(app.getHttpServer())
          .get(`/api/v1/companies/${companyId}/documents/${documentId}`);

        const tags = docResponse.body.tags.map((t: any) => t.tag);
        expect(tags).not.toContain('to-remove');
        expect(tags).toContain('keep');
      });
    });
  });

  // ==========================================
  // ACCESS CONTROL
  // ==========================================

  describe('Access Control', () => {
    it('should deny access to documents from another company', async () => {
      // Create document in first company
      const doc = await createTestDocument('Private Doc', 'GENERAL');

      // Create another company
      const company2 = await createTestCompany(
        prisma,
        TEST_USER_2.id,
        'Other Company',
      );

      // Switch to TEST_USER_2
      mockAuthGuard.setMockUserId(TEST_USER_2.id);

      // Try to access document from first company using different companyId
      await request(app.getHttpServer())
        .get(`/api/v1/companies/${company2.id}/documents/${doc.id}`)
        .expect(404);
    });
  });
});
