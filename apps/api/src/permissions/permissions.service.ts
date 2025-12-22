import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from './permissions.constants';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private initializingCompanies = new Set<string>();

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has a specific permission in a company
   * OWNER role always returns true (bypasses all permission checks)
   */
  async hasPermission(
    userId: string,
    companyId: string,
    permissionCode: string,
  ): Promise<boolean> {
    // Get user's membership
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
      include: { customRole: true },
    });

    // Not a member - return false
    if (!membership) return false;

    // OWNER always has full access - bypass permission checks
    if (membership.role === MemberRole.OWNER) return true;

    // Look up the permission
    const permission = await this.prisma.permission.findUnique({
      where: { code: permissionCode },
    });

    if (!permission) return false;

    // Check RolePermission table
    // Query for both system roles (role field) and custom roles (customRoleId field)
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        companyId,
        permissionId: permission.id,
        OR: [
          { role: membership.role, customRoleId: null },
          { customRoleId: membership.customRoleId },
        ],
      },
    });

    return rolePermission?.granted ?? false;
  }

  /**
   * Check if user has any of the given permissions
   * Useful for OR logic (user needs at least one permission)
   */
  async hasAnyPermission(
    userId: string,
    companyId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    for (const code of permissionCodes) {
      if (await this.hasPermission(userId, companyId, code)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all permissions for a user in a company
   * Returns array of permission codes
   */
  async getUserPermissions(userId: string, companyId: string): Promise<string[]> {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership) return [];

    // OWNER gets all permissions
    if (membership.role === MemberRole.OWNER) {
      const allPermissions = await this.prisma.permission.findMany();
      return allPermissions.map((p) => p.code);
    }

    // Get granted permissions from RolePermission table
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        companyId,
        granted: true,
        OR: [
          { role: membership.role, customRoleId: null },
          { customRoleId: membership.customRoleId },
        ],
      },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission.code);
  }

  /**
   * Get all permissions grouped by role for a company
   * Used by the permissions management UI
   * Auto-initializes permissions if they don't exist for this company
   */
  async getCompanyPermissions(companyId: string) {
    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ area: 'asc' }, { action: 'asc' }],
    });

    // Check if permissions have been initialized for this company
    const existingPermissions = await this.prisma.rolePermission.count({
      where: { companyId },
    });

    // Auto-initialize if no permissions exist (with race condition protection)
    if (existingPermissions === 0) {
      // Check if another request is already initializing this company
      if (!this.initializingCompanies.has(companyId)) {
        this.initializingCompanies.add(companyId);
        try {
          this.logger.log(`Initializing permissions for company ${companyId}`);
          await this.initializeCompanyPermissions(companyId);
        } finally {
          this.initializingCompanies.delete(companyId);
        }
      } else {
        // Wait for the other request to finish initialization
        while (this.initializingCompanies.has(companyId)) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { companyId },
      include: { permission: true, customRole: true },
    });

    // Group by role (system roles)
    const systemRoles: Record<string, Record<string, boolean>> = {
      ADMIN: {},
      BOARD_MEMBER: {},
      OBSERVER: {},
    };

    for (const rp of rolePermissions) {
      if (rp.role && !rp.customRoleId) {
        systemRoles[rp.role][rp.permission.code] = rp.granted;
      }
    }

    // Get custom roles
    const customRoles = await this.prisma.customRole.findMany({
      where: { companyId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    const customRolesPermissions = customRoles.map((cr) => ({
      id: cr.id,
      name: cr.name,
      description: cr.description,
      permissions: Object.fromEntries(
        cr.permissions.map((rp) => [rp.permission.code, rp.granted]),
      ),
    }));

    return {
      allPermissions,
      systemRoles,
      customRoles: customRolesPermissions,
    };
  }

  /**
   * Update permissions for a role (system or custom)
   */
  async updateRolePermissions(
    companyId: string,
    role: MemberRole | null,
    customRoleId: string | null,
    permissions: Record<string, boolean>,
  ): Promise<void> {
    const allPermissions = await this.prisma.permission.findMany();
    const permissionMap = new Map(allPermissions.map((p) => [p.code, p.id]));

    for (const [code, granted] of Object.entries(permissions)) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;

      if (role && !customRoleId) {
        // System role permission
        await this.prisma.rolePermission.upsert({
          where: {
            companyId_role_permissionId: { companyId, role, permissionId },
          },
          create: { companyId, role, permissionId, granted },
          update: { granted },
        });
      } else if (customRoleId) {
        // Custom role permission
        await this.prisma.rolePermission.upsert({
          where: {
            companyId_customRoleId_permissionId: {
              companyId,
              customRoleId,
              permissionId,
            },
          },
          create: { companyId, customRoleId, permissionId, granted },
          update: { granted },
        });
      }
    }
  }

  /**
   * Initialize default permissions for a new company
   * Creates RolePermission entries for all system roles (ADMIN, BOARD_MEMBER, OBSERVER)
   * based on the default permission mappings
   * Uses upsert to handle race conditions safely
   */
  async initializeCompanyPermissions(companyId: string): Promise<void> {
    // Get all permissions from the database
    const permissions = await this.prisma.permission.findMany();

    // Create RolePermission entries for each system role
    const roles = [MemberRole.ADMIN, MemberRole.BOARD_MEMBER, MemberRole.OBSERVER];

    // Use a transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const role of roles) {
        const grantedCodes = DEFAULT_ROLE_PERMISSIONS[role];

        for (const permission of permissions) {
          // Use upsert to safely handle race conditions
          await tx.rolePermission.upsert({
            where: {
              companyId_role_permissionId: {
                companyId,
                role,
                permissionId: permission.id,
              },
            },
            create: {
              companyId,
              role,
              permissionId: permission.id,
              granted: grantedCodes.includes(permission.code),
            },
            update: {}, // Don't update if exists - preserve any manual changes
          });
        }
      }
    });
  }

  /**
   * Verify user is OWNER of company
   * Throws ForbiddenException if not owner
   */
  async verifyOwner(userId: string, companyId: string): Promise<void> {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only company owner can manage permissions');
    }
  }
}
