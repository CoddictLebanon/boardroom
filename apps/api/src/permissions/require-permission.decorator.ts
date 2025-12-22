import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for an endpoint
 * @param permissions - Single permission code or array of codes (OR logic)
 *
 * @example
 * // Single permission
 * @RequirePermission('meetings.create')
 *
 * @example
 * // Multiple permissions (OR logic - user needs at least one)
 * @RequirePermission('meetings.edit', 'meetings.delete')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
