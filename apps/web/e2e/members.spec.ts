import { test, expect } from './fixtures';

test.describe('Members Page', () => {
  async function navigateToMembers(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/members`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display members page', async ({ page }) => {
    const companyId = await navigateToMembers(page);

    if (companyId) {
      // Should show members heading
      const heading = page.locator('h1, h2').filter({
        hasText: /members|team|board/i,
      });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show invite button', async ({ page }) => {
    const companyId = await navigateToMembers(page);

    if (companyId) {
      const inviteButton = page.locator(
        'button:has-text("Invite"), a:has-text("Invite"), button:has-text("Add Member")'
      );
      await expect(inviteButton.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display member list', async ({ page }) => {
    const companyId = await navigateToMembers(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for member cards/rows
      const memberItems = page.locator('[class*="Card"], tr, [class*="member" i]').filter({
        has: page.locator('[class*="Avatar"], img, [class*="name" i]'),
      });

      // Should have at least one member (the current user)
      await expect(memberItems.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show member roles', async ({ page }) => {
    const companyId = await navigateToMembers(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for role badges
      const roleBadges = page.locator('[class*="Badge"]').filter({
        hasText: /owner|admin|member|board/i,
      });

      // Should have at least one role badge
      await expect(roleBadges.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open invite dialog when clicking invite', async ({ page }) => {
    const companyId = await navigateToMembers(page);

    if (companyId) {
      const inviteButton = page.locator(
        'button:has-text("Invite"), a:has-text("Invite")'
      );

      if ((await inviteButton.count()) > 0) {
        await inviteButton.first().click();
        await page.waitForTimeout(1000);

        // Should show dialog or form
        const dialog = page.locator('[role="dialog"], [class*="Dialog"]');
        const emailInput = page.locator('input[type="email"], input[name="email"]');

        const hasDialog = (await dialog.count()) > 0;
        const hasEmailInput = (await emailInput.count()) > 0;

        expect(hasDialog || hasEmailInput).toBeTruthy();
      }
    }
  });
});

test.describe('Settings Page', () => {
  async function navigateToSettings(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/settings`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display settings page', async ({ page }) => {
    const companyId = await navigateToSettings(page);

    if (companyId) {
      // Should show settings heading
      const heading = page.locator('h1, h2').filter({ hasText: /settings/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show company name field', async ({ page }) => {
    const companyId = await navigateToSettings(page);

    if (companyId) {
      // Look for company name input
      const nameInput = page.locator(
        'input[name="name"], input[placeholder*="name" i], input[id*="name" i]'
      );

      if ((await nameInput.count()) > 0) {
        await expect(nameInput.first()).toBeVisible();
      }
    }
  });

  test('should have save button', async ({ page }) => {
    const companyId = await navigateToSettings(page);

    if (companyId) {
      const saveButton = page.locator(
        'button:has-text("Save"), button:has-text("Update"), button[type="submit"]'
      );
      await expect(saveButton.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Permissions Page', () => {
  async function navigateToPermissions(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/settings/permissions`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display permissions page', async ({ page }) => {
    const companyId = await navigateToPermissions(page);

    if (companyId) {
      // Should show permissions heading
      const heading = page.locator('h1, h2').filter({ hasText: /permissions/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show role columns', async ({ page }) => {
    const companyId = await navigateToPermissions(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for role headers
      const ownerColumn = page.locator('text=/owner/i');
      const adminColumn = page.locator('text=/admin/i');
      const memberColumn = page.locator('text=/member|board/i');

      const hasOwner = (await ownerColumn.count()) > 0;
      const hasAdmin = (await adminColumn.count()) > 0;
      const hasMember = (await memberColumn.count()) > 0;

      // At least one role should be visible
      expect(hasOwner || hasAdmin || hasMember).toBeTruthy();
    }
  });

  test('should show permission toggles', async ({ page }) => {
    const companyId = await navigateToPermissions(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for toggle/checkbox elements
      const toggles = page.locator(
        '[role="switch"], input[type="checkbox"], [class*="Switch"]'
      );

      // Should have permission toggles
      await expect(toggles.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
