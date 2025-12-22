import { Test, TestingModule } from '@nestjs/testing';
import { CustomRolesService } from '../custom-roles.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';

describe('CustomRolesService', () => {
  let service: CustomRolesService;

  const mockPrismaService = {
    companyMember: {
      findFirst: jest.fn(),
    },
    customRole: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomRolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomRolesService>(CustomRolesService);

    jest.clearAllMocks();
  });

  describe('getCompanyCustomRoles', () => {
    it('should return all custom roles for a company', async () => {
      const mockRoles = [
        { id: '1', name: 'Auditor', description: 'Financial auditor' },
        { id: '2', name: 'Secretary', description: 'Board secretary' },
      ];
      mockPrismaService.customRole.findMany.mockResolvedValue(mockRoles);

      const result = await service.getCompanyCustomRoles('company-123');

      expect(result).toEqual(mockRoles);
      expect(mockPrismaService.customRole.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-123' },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('createCustomRole', () => {
    const companyId = 'company-123';
    const dto = { name: 'Auditor', description: 'Financial auditor' };

    it('should create a custom role', async () => {
      mockPrismaService.customRole.count.mockResolvedValue(2);
      mockPrismaService.customRole.findFirst.mockResolvedValue(null);
      mockPrismaService.customRole.create.mockResolvedValue({
        id: 'role-1',
        ...dto,
        companyId,
      });

      const result = await service.createCustomRole(companyId, dto);

      expect(result.name).toBe('Auditor');
      expect(mockPrismaService.customRole.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if 5 roles already exist', async () => {
      mockPrismaService.customRole.count.mockResolvedValue(5);

      await expect(service.createCustomRole(companyId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if role name already exists', async () => {
      mockPrismaService.customRole.count.mockResolvedValue(2);
      mockPrismaService.customRole.findFirst.mockResolvedValue({
        id: 'existing',
        name: 'Auditor',
      });

      await expect(service.createCustomRole(companyId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCustomRole', () => {
    const roleId = 'role-123';

    it('should update a custom role', async () => {
      mockPrismaService.customRole.findUnique.mockResolvedValue({
        id: roleId,
        name: 'Old Name',
        companyId: 'company-123',
      });
      mockPrismaService.customRole.findFirst.mockResolvedValue(null);
      mockPrismaService.customRole.update.mockResolvedValue({
        id: roleId,
        name: 'New Name',
      });

      const result = await service.updateCustomRole(roleId, { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPrismaService.customRole.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCustomRole(roleId, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name conflicts with existing role', async () => {
      mockPrismaService.customRole.findUnique.mockResolvedValue({
        id: roleId,
        name: 'Old Name',
        companyId: 'company-123',
      });
      mockPrismaService.customRole.findFirst.mockResolvedValue({
        id: 'other-role',
        name: 'New Name',
      });

      await expect(
        service.updateCustomRole(roleId, { name: 'New Name' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteCustomRole', () => {
    const roleId = 'role-123';

    it('should delete a custom role', async () => {
      mockPrismaService.customRole.findUnique.mockResolvedValue({
        id: roleId,
        name: 'Auditor',
        members: [], // No members assigned
      });
      mockPrismaService.customRole.delete.mockResolvedValue({});

      await service.deleteCustomRole(roleId);

      expect(mockPrismaService.customRole.delete).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it('should throw NotFoundException if role does not exist', async () => {
      mockPrismaService.customRole.findUnique.mockResolvedValue(null);

      await expect(service.deleteCustomRole(roleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if members are assigned to the role', async () => {
      mockPrismaService.customRole.findUnique.mockResolvedValue({
        id: roleId,
        name: 'Auditor',
        members: [{ id: 'member-1' }, { id: 'member-2' }], // Has assigned members
      });

      await expect(service.deleteCustomRole(roleId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('verifyOwner', () => {
    it('should not throw if user is OWNER', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        role: MemberRole.OWNER,
      });

      await expect(
        service.verifyOwner('user-123', 'company-123'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if user is not OWNER', async () => {
      mockPrismaService.companyMember.findFirst.mockResolvedValue({
        role: MemberRole.ADMIN,
      });

      await expect(
        service.verifyOwner('user-123', 'company-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
