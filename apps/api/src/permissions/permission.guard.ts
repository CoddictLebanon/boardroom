import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { PERMISSIONS_KEY } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Get userId from request.auth (set by ClerkAuthGuard)
    const userId = request.auth?.userId;

    // Get companyId from request params
    const companyId = request.params?.companyId;

    if (!userId) {
      this.logger.warn('PermissionGuard: Missing userId in request.auth');
      throw new ForbiddenException('User authentication required');
    }

    if (!companyId) {
      this.logger.warn('PermissionGuard: Missing companyId in request.params');
      throw new ForbiddenException('Company context required');
    }

    // Check if user has any of the required permissions (OR logic)
    const hasPermission = await this.permissionsService.hasAnyPermission(
      userId,
      companyId,
      requiredPermissions,
    );

    if (!hasPermission) {
      this.logger.warn(
        `PermissionGuard: User ${userId} denied access to company ${companyId}. Required: ${requiredPermissions.join(' or ')}`,
      );
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermissions.join(' or ')}`,
      );
    }

    this.logger.debug(
      `PermissionGuard: User ${userId} granted access to company ${companyId}`,
    );
    return true;
  }
}
