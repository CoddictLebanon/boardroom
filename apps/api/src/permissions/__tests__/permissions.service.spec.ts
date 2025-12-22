import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from '../permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    companyMember: {
      findFirst: jest.fn(),
    },
    permission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    rolePermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    customRole: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    const userId = 'user-123';
    const companyId = 'company-123';
    const permissionCode = 'meetings.view';

    it('should return false if user is not a member', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue(null);

      const result = await service.hasPermission(userId, companyId, permissionCode);

      expect(result).toBe(false);
      expect(mockPrismaService.companyMember.findFirst).toHaveBeenCalledWith({
        where: { userId, companyId, status: 'ACTIVE' },
        include: { customRole: true },
      });
    });

    it('should return true if user is OWNER (bypass all checks)', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.OWNER,
        customRoleId: null,
      });

      const result = await service.hasPermission(userId, companyId, permissionCode);

      expect(result).toBe(true);
      // Should not query permission table for OWNER
      expect(mockPrismaService.permission.findUnique).not.toHaveBeenCalled();
    });

    it('should return false if permission code does not exist', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.ADMIN,
        customRoleId: null,
      });
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      const result = await service.hasPermission(userId, companyId, 'invalid.permission');

      expect(result).toBe(false);
    });

    it('should return true if role has granted permission', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.ADMIN,
        customRoleId: null,
      });
      mockPrismaService.permission.findUnique.mockResolvedValue({
        id: 'perm-1',
        code: permissionCode,
      });
      mockPrismaService.rolePermission.findFirst.mockResolvedValue({
        id: 'rp-1',
        granted: true,
      });

      const result = await service.hasPermission(userId, companyId, permissionCode);

      expect(result).toBe(true);
    });

    it('should return false if role does not have granted permission', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.OBSERVER,
        customRoleId: null,
      });
      mockPrismaService.permission.findUnique.mockResolvedValue({
        id: 'perm-1',
        code: permissionCode,
      });
      mockPrismaService.rolePermission.findFirst.mockResolvedValue({
        id: 'rp-1',
        granted: false,
      });

      const result = await service.hasPermission(userId, companyId, permissionCode);

      expect(result).toBe(false);
    });

    it('should check custom role permissions when user has customRoleId', async () => {
      const customRoleId = 'custom-role-1';
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.BOARD_MEMBER,
        customRoleId,
      });
      mockPrismaService.permission.findUnique.mockResolvedValue({
        id: 'perm-1',
        code: permissionCode,
      });
      mockPrismaService.rolePermission.findFirst.mockResolvedValue({
        id: 'rp-1',
        granted: true,
      });

      await service.hasPermission(userId, companyId, permissionCode);

      expect(mockPrismaService.rolePermission.findFirst).toHaveBeenCalledWith({
        where: {
          companyId,
          permissionId: 'perm-1',
          OR: [
            { role: MemberRole.BOARD_MEMBER, customRoleId: null },
            { customRoleId },
          ],
        },
      });
    });
  });

  describe('hasAnyPermission', () => {
    const userId = 'user-123';
    const companyId = 'company-123';

    it('should return true if user has at least one permission', async () => {
      // Mock OWNER to bypass checks
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.OWNER,
      });

      const result = await service.hasAnyPermission(userId, companyId, [
        'meetings.view',
        'meetings.create',
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue(null);

      const result = await service.hasAnyPermission(userId, companyId, [
        'meetings.view',
        'meetings.create',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    const userId = 'user-123';
    const companyId = 'company-123';

    it('should return empty array if user is not a member', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue(null);

      const result = await service.getUserPermissions(userId, companyId);

      expect(result).toEqual([]);
    });

    it('should return all permissions for OWNER', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.OWNER,
      });
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: '1', code: 'meetings.view' },
        { id: '2', code: 'meetings.create' },
        { id: '3', code: 'financials.view' },
      ]);

      const result = await service.getUserPermissions(userId, companyId);

      expect(result).toEqual(['meetings.view', 'meetings.create', 'financials.view']);
    });

    it('should return granted permissions for non-OWNER roles', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.ADMIN,
        customRoleId: null,
      });
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        { permission: { code: 'meetings.view' } },
        { permission: { code: 'meetings.create' } },
      ]);

      const result = await service.getUserPermissions(userId, companyId);

      expect(result).toEqual(['meetings.view', 'meetings.create']);
    });
  });

  describe('verifyOwner', () => {
    const userId = 'user-123';
    const companyId = 'company-123';

    it('should not throw if user is OWNER', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.OWNER,
      });

      await expect(service.verifyOwner(userId, companyId)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if user is not OWNER', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: MemberRole.ADMIN,
      });

      await expect(service.verifyOwner(userId, companyId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue(null);

      await expect(service.verifyOwner(userId, companyId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('initializeCompanyPermissions', () => {
    const companyId = 'company-123';

    it('should create RolePermission entries for all system roles', async () => {
      const mockPermissions = [
        { id: 'p1', code: 'meetings.view' },
        { id: 'p2', code: 'meetings.create' },
      ];
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.rolePermission.findUnique.mockResolvedValue(null);
      mockPrismaService.rolePermission.create.mockResolvedValue({});

      await service.initializeCompanyPermissions(companyId);

      // Should create permissions for ADMIN, BOARD_MEMBER, OBSERVER (3 roles x 2 permissions = 6 calls)
      expect(mockPrismaService.rolePermission.create).toHaveBeenCalledTimes(6);
    });

    it('should not duplicate existing permissions', async () => {
      const mockPermissions = [{ id: 'p1', code: 'meetings.view' }];
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      // Permission already exists
      mockPrismaService.rolePermission.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await service.initializeCompanyPermissions(companyId);

      expect(mockPrismaService.rolePermission.create).not.toHaveBeenCalled();
    });
  });

  describe('getCompanyPermissions', () => {
    const companyId = 'company-123';

    it('should auto-initialize permissions if none exist', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.count.mockResolvedValue(0);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([]);
      mockPrismaService.customRole.findMany.mockResolvedValue([]);
      mockPrismaService.rolePermission.findUnique.mockResolvedValue(null);

      await service.getCompanyPermissions(companyId);

      // Should have checked count and attempted initialization
      expect(mockPrismaService.rolePermission.count).toHaveBeenCalledWith({
        where: { companyId },
      });
    });

    it('should return grouped permissions by role', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([
        { id: 'p1', code: 'meetings.view', area: 'meetings', action: 'view' },
      ]);
      mockPrismaService.rolePermission.count.mockResolvedValue(3);
      mockPrismaService.rolePermission.findMany.mockResolvedValue([
        {
          role: MemberRole.ADMIN,
          customRoleId: null,
          permission: { code: 'meetings.view' },
          granted: true,
        },
      ]);
      mockPrismaService.customRole.findMany.mockResolvedValue([]);

      const result = await service.getCompanyPermissions(companyId);

      expect(result).toHaveProperty('allPermissions');
      expect(result).toHaveProperty('systemRoles');
      expect(result).toHaveProperty('customRoles');
      expect(result.systemRoles.ADMIN['meetings.view']).toBe(true);
    });
  });
});
