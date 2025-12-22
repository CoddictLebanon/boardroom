import { MemberRole } from '@prisma/client';

/**
 * Default permissions for system roles when a company is created
 * OWNER role bypasses all checks and doesn't need explicit permissions
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  OWNER: [], // OWNER bypasses all checks, doesn't need explicit permissions

  ADMIN: [
    // Full access except members.change_roles
    'meetings.view',
    'meetings.view_all',
    'meetings.create',
    'meetings.edit',
    'meetings.delete',
    'meetings.start_live',
    'action_items.view',
    'action_items.view_all',
    'action_items.create',
    'action_items.edit',
    'action_items.delete',
    'action_items.complete',
    'resolutions.view',
    'resolutions.create',
    'resolutions.edit',
    'resolutions.delete',
    'resolutions.change_status',
    'documents.view',
    'documents.upload',
    'documents.download',
    'documents.delete',
    'financials.view',
    'financials.edit',
    'financials.manage_pdfs',
    'okrs.view',
    'okrs.create',
    'okrs.edit',
    'okrs.delete',
    'okrs.close',
    'members.view',
    'members.invite',
    'members.remove',
    'company.view_settings',
    'company.edit_settings',
  ],

  BOARD_MEMBER: [
    // Can view and create/edit, but not delete or manage members
    'meetings.view',
    'meetings.create',
    'meetings.edit',
    'meetings.start_live',
    'action_items.view',
    'action_items.create',
    'action_items.edit',
    'action_items.complete',
    'resolutions.view',
    'resolutions.create',
    'resolutions.edit',
    'resolutions.change_status',
    'documents.view',
    'documents.upload',
    'documents.download',
    'financials.view',
    'financials.edit',
    'financials.manage_pdfs',
    'okrs.view',
    'okrs.edit',
    'members.view',
    'company.view_settings',
  ],

  OBSERVER: [
    // View-only access
    'meetings.view',
    'action_items.view',
    'resolutions.view',
    'documents.view',
    'documents.download',
    'financials.view',
    'okrs.view',
    'members.view',
    'company.view_settings',
  ],
};
