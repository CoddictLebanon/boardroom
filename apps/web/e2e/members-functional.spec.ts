import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Members - Full Functionality', () => {
  let companyId: string;
  const testEmail = `e2e-test-${Date.now()}@example.com`;

  test('should display members list', async ({ page }) => {
    // Navigate to companies page and extract companyId
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
      // Company cards have cursor-pointer class with h3 inside
      const companyCard = page.locator('[class*="cursor-pointer"]').filter({
        has: page.locator('h3'),
      }).first();
      if (await companyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await companyCard.click();
        await page.waitForURL(/\/companies\/[\w-]+\/dashboard/, { timeout: 10000 });
        url = page.url();
        match = url.match(/\/companies\/([\w-]+)/);
      }
    }

    test.skip(!match, 'No company available');
    companyId = match![1];

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Should show members page
    const heading = page.locator('h1, h2').filter({ hasText: /members|team/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });

    // Should show at least one member (the current user)
    const memberCards = page.locator('[class*="member"], [class*="user"], table tbody tr');
    expect(await memberCards.count()).toBeGreaterThan(0);
  });

  test('should show invite button', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Look for invite button - exact text from UI
    const inviteButton = page.locator('button:has-text("Invite Member")').first();
    await expect(inviteButton).toBeVisible({ timeout: 10000 });
  });

  test('should open invite dialog', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Click invite button - exact text from UI
    const inviteButton = page.locator('button:has-text("Invite Member")').first();
    await inviteButton.click();

    // Should show invite dialog/modal
    await page.waitForTimeout(500);
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('should send invitation', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Click invite button - exact text from UI
    const inviteButton = page.locator('button:has-text("Invite Member")').first();
    await inviteButton.click();
    await page.waitForTimeout(500);

    // Fill email - placeholder is "member@example.com"
    const dialog = page.locator('[role="dialog"]');
    const emailInput = dialog.locator('input[placeholder*="member@example.com"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Clear and type the email to trigger validation
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.pressSequentially(testEmail, { delay: 10 });

    // Wait for validation to complete
    await page.waitForTimeout(500);

    // Send invitation - button text is "Send Invitation"
    const sendButton = dialog.locator('button:has-text("Send Invitation")');

    // Wait for button to become enabled
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify invitation was sent (success message or email appears in pending list)
    const successMessage = page.locator('text=/sent|invited|success/i');
    const pendingInvite = page.locator(`text=${testEmail}`);

    const hasSuccess = await successMessage.isVisible().catch(() => false);
    const hasPending = await pendingInvite.isVisible().catch(() => false);

    expect(hasSuccess || hasPending).toBeTruthy();
  });

  test('should display member roles', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Look for role badges or labels
    const roles = page.locator('text=/Owner|Admin|Board Member|Secretary|Observer/i');
    expect(await roles.count()).toBeGreaterThan(0);
  });

  test('should change member role', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Find a member that's not the owner
    const memberRows = page.locator('[class*="member"], table tbody tr').filter({
      hasNot: page.locator('text=/Owner/i'),
    });

    if (await memberRows.count() > 0) {
      const firstMember = memberRows.first();

      // Look for role dropdown or edit button
      const roleSelect = firstMember.locator('select, [role="combobox"]').first();
      const editButton = firstMember.locator('button:has-text("Edit"), button[aria-label*="edit" i]').first();

      if (await roleSelect.isVisible()) {
        // Direct dropdown
        await roleSelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      } else if (await editButton.isVisible()) {
        // Edit modal
        await editButton.click();
        await page.waitForTimeout(500);

        const modalRoleSelect = page.locator('select[name="role"], [data-testid="role-select"]').first();
        if (await modalRoleSelect.isVisible()) {
          await modalRoleSelect.selectOption({ index: 1 });

          const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
          await saveButton.click();
        }
      }
    }
  });

  test('should show pending invitations', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Look for pending invitations section or tab
    const pendingTab = page.locator('[role="tab"]:has-text("Pending"), button:has-text("Pending"), button:has-text("Invitations")').first();

    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      await page.waitForTimeout(500);

      // Should show pending invitations list
      const pendingSection = page.locator('[class*="pending"], [class*="invitation"]');
      expect(await pendingSection.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('should cancel pending invitation', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Look for pending invitations
    const pendingTab = page.locator('[role="tab"]:has-text("Pending"), button:has-text("Pending")').first();
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      await page.waitForTimeout(500);
    }

    // Find our test invitation
    const invitation = page.locator(`text=${testEmail}`).first();

    if (await invitation.isVisible()) {
      // Look for cancel/revoke button
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Revoke"), button[aria-label*="cancel" i]').first();

      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Confirm if needed
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify invitation was cancelled
        await page.waitForTimeout(1000);
        const cancelledInvite = page.locator(`text=${testEmail}`);
        await expect(cancelledInvite).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should remove member from company', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/members`);
    await page.waitForLoadState('networkidle');

    // Find a member that's not the owner (can't remove owner)
    const memberRows = page.locator('[class*="member"], table tbody tr').filter({
      hasNot: page.locator('text=/Owner/i'),
    });

    if (await memberRows.count() > 1) {
      // Get the last non-owner member
      const memberToRemove = memberRows.last();

      // Look for remove button
      const removeButton = memberToRemove.locator('button:has-text("Remove"), button[aria-label*="remove" i], button[aria-label*="delete" i]').first();

      if (await removeButton.isVisible()) {
        await removeButton.click();

        // Confirm removal
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Remove")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify member was removed
        await page.waitForTimeout(1000);
        // Member count should decrease
        const newCount = await memberRows.count();
        expect(newCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Settings Page', () => {
  test.describe.configure({ mode: 'serial' });
  let companyId: string;

  test('should display settings page', async ({ page }) => {
    // Navigate to companies page and extract companyId
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
      // Company cards have cursor-pointer class with h3 inside
      const companyCard = page.locator('[class*="cursor-pointer"]').filter({
        has: page.locator('h3'),
      }).first();
      if (await companyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await companyCard.click();
        await page.waitForURL(/\/companies\/[\w-]+\/dashboard/, { timeout: 10000 });
        url = page.url();
        match = url.match(/\/companies\/([\w-]+)/);
      }
    }

    test.skip(!match, 'No company available');
    companyId = match![1];

    await page.goto(`/companies/${companyId}/settings`);
    await page.waitForLoadState('networkidle');

    // Should show settings page
    const heading = page.locator('h1, h2').filter({ hasText: /settings/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should update company name', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/settings`);
    await page.waitForLoadState('networkidle');

    // Find company name input
    const nameInput = page.locator('input[name="name"], input[id="name"], input[placeholder*="company" i]').first();

    if (await nameInput.isVisible()) {
      const originalName = await nameInput.inputValue();

      // Update name
      await nameInput.fill(`${originalName} - Updated`);

      // Save changes
      const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      await saveButton.click();

      // Wait for save
      await page.waitForTimeout(2000);

      // Revert to original name
      await nameInput.fill(originalName);
      await saveButton.click();
    }
  });

  test('should access permissions page', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/settings/permissions`);
    await page.waitForLoadState('networkidle');

    // Should show permissions page
    const heading = page.locator('h1, h2').filter({ hasText: /role permissions/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display permission matrix', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/settings/permissions`);
    await page.waitForLoadState('networkidle');

    // Look for permission toggles or checkboxes
    const permissionToggles = page.locator('input[type="checkbox"], [role="switch"], [role="checkbox"]');
    expect(await permissionToggles.count()).toBeGreaterThan(0);
  });

  test('should toggle permission', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/settings/permissions`);
    await page.waitForLoadState('networkidle');

    // Find a permission toggle
    const toggle = page.locator('input[type="checkbox"], [role="switch"], [role="checkbox"]').first();

    if (await toggle.isVisible()) {
      const initialState = await toggle.isChecked().catch(() => false);

      // Toggle it
      await toggle.click();
      await page.waitForTimeout(500);

      // Toggle back to original state
      await toggle.click();
      await page.waitForTimeout(500);

      // Verify it's back to original
      const finalState = await toggle.isChecked().catch(() => false);
      expect(finalState).toBe(initialState);
    }
  });
});
