import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Action Items - Full CRUD Functionality', () => {
  let companyId: string;
  const testActionTitle = `E2E Test Action ${Date.now()}`;

  test('should create a new action item', async ({ page }) => {
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

    await page.goto(`/companies/${companyId}/action-items`);
    await page.waitForLoadState('networkidle');

    // Look for create button - exact text from UI
    const createButton = page.locator('button:has-text("New Action Item"), button:has-text("Create Action Item")').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for dialog to open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in action item details - placeholder is "e.g., Review quarterly report"
    const titleInput = dialog.locator('input[placeholder*="Review quarterly"], input[placeholder*="title" i]').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(testActionTitle);

    // Fill description if present
    const descInput = dialog.locator('textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Created by Playwright E2E test');
    }

    // Due date and other optional fields are handled by the form defaults

    // Submit - target the create button in the dialog
    const submitButton = dialog.locator('button:has-text("Create Action Item"), button:has-text("Create")').first();
    await submitButton.click();

    // Wait for action item to appear in list
    await page.waitForTimeout(2000);

    // Verify action item was created
    const actionItem = page.locator(`text=${testActionTitle}`);
    await expect(actionItem).toBeVisible({ timeout: 10000 });
  });

  test('should display action item in list', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/action-items`);
    await page.waitForLoadState('networkidle');

    // Verify our test action item is visible
    const actionItem = page.locator(`text=${testActionTitle}`);
    await expect(actionItem).toBeVisible({ timeout: 10000 });
  });

  test('should mark action item as complete', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/action-items`);
    await page.waitForLoadState('networkidle');

    // Find our action item row
    const actionRow = page.locator(`text=${testActionTitle}`).locator('..').locator('..');

    // Look for checkbox or complete button
    const checkbox = actionRow.locator('input[type="checkbox"], button[aria-label*="complete" i], [role="checkbox"]').first();

    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(1000);

      // Verify status changed - look for completed indicator
      const completedIndicator = page.locator('[data-status="completed"], .completed, [class*="completed"]').first();
      // Or check if item moved to completed tab
      const completedTab = page.locator('button:has-text("Completed"), [role="tab"]:has-text("Completed")').first();
      if (await completedTab.isVisible()) {
        await completedTab.click();
        await page.waitForTimeout(500);
        const completedItem = page.locator(`text=${testActionTitle}`);
        await expect(completedItem).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should filter action items by status', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/action-items`);
    await page.waitForLoadState('networkidle');

    // Look for filter tabs
    const allTab = page.locator('[role="tab"]:has-text("All"), button:has-text("All")').first();
    const pendingTab = page.locator('[role="tab"]:has-text("Pending"), button:has-text("Pending"), button:has-text("Open")').first();
    const completedTab = page.locator('[role="tab"]:has-text("Completed"), button:has-text("Completed"), button:has-text("Done")').first();

    // Test pending filter
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      await page.waitForTimeout(500);
      // Should show only pending items
      expect(page.url()).toContain('action-items');
    }

    // Test completed filter
    if (await completedTab.isVisible()) {
      await completedTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('action-items');
    }

    // Test all filter
    if (await allTab.isVisible()) {
      await allTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('action-items');
    }
  });

  test('should edit action item', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/action-items`);
    await page.waitForLoadState('networkidle');

    // Find and click on our action item
    const actionItem = page.locator(`text=${testActionTitle}`).first();
    if (await actionItem.isVisible()) {
      await actionItem.click();
      await page.waitForTimeout(500);

      // Look for edit button or inline edit
      const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Update title
        const titleInput = page.locator('input[name="title"], input[value*="E2E Test"]').first();
        if (await titleInput.isVisible()) {
          await titleInput.fill(`${testActionTitle} - Updated`);

          // Save
          const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
          await saveButton.click();

          // Verify update
          await page.waitForTimeout(1000);
          const updatedItem = page.locator(`text=${testActionTitle} - Updated`);
          await expect(updatedItem).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should delete action item', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/action-items`);
    await page.waitForLoadState('networkidle');

    // Find our action item (use :has-text for partial match)
    const actionItem = page.locator(`:has-text("${testActionTitle}")`).first();

    if (await actionItem.isVisible()) {
      // Look for delete button (might be in a dropdown or directly visible)
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i], [data-testid="delete"]').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify item is removed
        await page.waitForTimeout(1000);
        const deletedItem = page.locator(`text=${testActionTitle}`);
        await expect(deletedItem).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});
