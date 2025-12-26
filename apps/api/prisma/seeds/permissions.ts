import { PrismaClient } from '@prisma/client';

export const PERMISSIONS = [
  // Meetings
  { code: 'meetings.view', area: 'meetings', action: 'view', description: 'View meetings you are invited to' },
  { code: 'meetings.view_all', area: 'meetings', action: 'view_all', description: 'View all meetings in the company' },
  { code: 'meetings.create', area: 'meetings', action: 'create', description: 'Create meetings' },
  { code: 'meetings.edit', area: 'meetings', action: 'edit', description: 'Edit meetings' },
  { code: 'meetings.delete', area: 'meetings', action: 'delete', description: 'Delete meetings' },
  { code: 'meetings.start_live', area: 'meetings', action: 'start_live', description: 'Start live meeting sessions' },

  // Action Items
  { code: 'action_items.view', area: 'action_items', action: 'view', description: 'View action items you are involved in' },
  { code: 'action_items.view_all', area: 'action_items', action: 'view_all', description: 'View all action items in the company' },
  { code: 'action_items.create', area: 'action_items', action: 'create', description: 'Create action items' },
  { code: 'action_items.edit', area: 'action_items', action: 'edit', description: 'Edit action items' },
  { code: 'action_items.delete', area: 'action_items', action: 'delete', description: 'Delete action items' },
  { code: 'action_items.complete', area: 'action_items', action: 'complete', description: 'Mark action items complete' },

  // Resolutions
  { code: 'resolutions.view', area: 'resolutions', action: 'view', description: 'View resolutions' },
  { code: 'resolutions.create', area: 'resolutions', action: 'create', description: 'Create resolutions' },
  { code: 'resolutions.edit', area: 'resolutions', action: 'edit', description: 'Edit resolutions' },
  { code: 'resolutions.delete', area: 'resolutions', action: 'delete', description: 'Delete resolutions' },
  { code: 'resolutions.change_status', area: 'resolutions', action: 'change_status', description: 'Change resolution status' },

  // Documents
  { code: 'documents.view', area: 'documents', action: 'view', description: 'View documents' },
  { code: 'documents.upload', area: 'documents', action: 'upload', description: 'Upload documents' },
  { code: 'documents.download', area: 'documents', action: 'download', description: 'Download documents' },
  { code: 'documents.delete', area: 'documents', action: 'delete', description: 'Delete documents' },

  // Financials
  { code: 'financials.view', area: 'financials', action: 'view', description: 'View financial data' },
  { code: 'financials.edit', area: 'financials', action: 'edit', description: 'Edit financial data' },
  { code: 'financials.manage_pdfs', area: 'financials', action: 'manage_pdfs', description: 'Upload/delete financial PDFs' },

  // Members
  { code: 'members.view', area: 'members', action: 'view', description: 'View company members' },
  { code: 'members.invite', area: 'members', action: 'invite', description: 'Invite new members' },
  { code: 'members.remove', area: 'members', action: 'remove', description: 'Remove members' },
  { code: 'members.change_roles', area: 'members', action: 'change_roles', description: 'Change member roles' },

  // Company
  { code: 'company.view_settings', area: 'company', action: 'view_settings', description: 'View company settings' },
  { code: 'company.edit_settings', area: 'company', action: 'edit_settings', description: 'Edit company settings' },

  // OKRs
  { code: 'okrs.view', area: 'okrs', action: 'view', description: 'View OKR periods, objectives, and key results' },
  { code: 'okrs.create', area: 'okrs', action: 'create', description: 'Create OKR periods and objectives' },
  { code: 'okrs.edit', area: 'okrs', action: 'edit', description: 'Edit objectives and update key result values' },
  { code: 'okrs.delete', area: 'okrs', action: 'delete', description: 'Delete OKR periods, objectives, and key results' },
  { code: 'okrs.close', area: 'okrs', action: 'close', description: 'Close and reopen OKR periods' },

  // Team/Org Chart
  { code: 'team.view', area: 'team', action: 'view', description: 'View organization chart' },
  { code: 'team.create', area: 'team', action: 'create', description: 'Create roles in org chart' },
  { code: 'team.edit', area: 'team', action: 'edit', description: 'Edit roles in org chart' },
  { code: 'team.delete', area: 'team', action: 'delete', description: 'Delete roles from org chart' },
];

export async function seedPermissions(prisma: PrismaClient) {
  console.log('Seeding permissions...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  console.log(`Seeded ${PERMISSIONS.length} permissions`);
}
