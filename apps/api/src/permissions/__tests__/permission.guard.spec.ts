import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../permission.guard';
import { PermissionsService } from '../permissions.service';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let permissionsService: PermissionsService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockPermissionsService = {
    hasAnyPermission: jest.fn(),
  };

  const createMockExecutionContext = (
    userId: string | null,
    companyId: string | null,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          auth: userId ? { userId } : null,
          params: { companyId },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionsService = module.get<PermissionsService>(PermissionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext('user-123', 'company-123');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasAnyPermission).not.toHaveBeenCalled();
    });

    it('should return true if empty permissions array', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext('user-123', 'company-123');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user is not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['meetings.view']);
      const context = createMockExecutionContext(null, 'company-123');

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if companyId is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['meetings.view']);
      const context = createMockExecutionContext('user-123', null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should return true if user has required permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['meetings.view']);
      mockPermissionsService.hasAnyPermission.mockResolvedValue(true);
      const context = createMockExecutionContext('user-123', 'company-123');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPermissionsService.hasAnyPermission).toHaveBeenCalledWith(
        'user-123',
        'company-123',
        ['meetings.view'],
      );
    });

    it('should throw ForbiddenException if user lacks permission', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['meetings.delete']);
      mockPermissionsService.hasAnyPermission.mockResolvedValue(false);
      const context = createMockExecutionContext('user-123', 'company-123');

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should check multiple permissions with OR logic', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([
        'meetings.edit',
        'meetings.delete',
      ]);
      mockPermissionsService.hasAnyPermission.mockResolvedValue(true);
      const context = createMockExecutionContext('user-123', 'company-123');

      await guard.canActivate(context);

      expect(mockPermissionsService.hasAnyPermission).toHaveBeenCalledWith(
        'user-123',
        'company-123',
        ['meetings.edit', 'meetings.delete'],
      );
    });
  });
});
