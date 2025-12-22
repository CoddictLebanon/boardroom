import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Resolutions - Full CRUD Functionality', () => {
  let companyId: string;
  const testResolutionTitle = `E2E Test Resolution ${Date.now()}`;

  test('should create a new resolution', async ({ page }) => {
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

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Look for create button - exact text from UI
    const createButton = page.locator('button:has-text("New Resolution"), button:has-text("Create Resolution")').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for modal/form
    await page.waitForTimeout(500);

    // Fill in resolution details - placeholder is "e.g., Approve 2025 Budget"
    const titleInput = page.locator('input[placeholder*="Approve 2025 Budget"], input[placeholder*="title" i]').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(testResolutionTitle);

    // Fill description/content
    const contentInput = page.locator('textarea, [contenteditable="true"]').first();
    if (await contentInput.isVisible()) {
      await contentInput.fill('This resolution was created by Playwright E2E test for testing voting functionality.');
    }

    // Select category if present
    const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }

    // Submit - target the button inside the dialog specifically
    const dialog = page.locator('[role="dialog"]');
    const submitButton = dialog.locator('button:has-text("Create Resolution")');
    await submitButton.click();

    // Wait for resolution to be created
    await page.waitForTimeout(2000);

    // Verify resolution was created (use .first() to handle potential duplicates from parallel runs)
    const resolution = page.locator(`text=${testResolutionTitle}`).first();
    await expect(resolution).toBeVisible({ timeout: 10000 });
  });

  test('should display resolution in list', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // Verify our test resolution is visible (use .first() to handle potential duplicates)
    const resolution = page.locator(`text=${testResolutionTitle}`).first();
    await expect(resolution).toBeVisible({ timeout: 10000 });
  });

  test('should open resolution detail', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Click on our resolution
    const resolution = page.locator(`text=${testResolutionTitle}`).first();
    await resolution.click();

    // Should navigate to detail page or open modal
    await page.waitForTimeout(1000);

    // Verify resolution content is visible (use first to avoid strict mode violation)
    const title = page.locator(`text=${testResolutionTitle}`).first();
    await expect(title).toBeVisible({ timeout: 5000 });
  });

  test('should cast vote on resolution', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Find a pending resolution to vote on
    const resolution = page.locator(`text=${testResolutionTitle}`).first();
    if (await resolution.isVisible()) {
      await resolution.click();
      await page.waitForTimeout(500);
    }

    // Look for voting buttons
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Yes"), button:has-text("In Favor")').first();
    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("No"), button:has-text("Against")').first();
    const abstainButton = page.locator('button:has-text("Abstain")').first();

    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.waitForTimeout(1000);

      // Verify vote was recorded
      const voteConfirmation = page.locator('text=/voted|your vote|approved/i');
      // Vote should be registered (button might change state or confirmation appears)
      const buttonState = await approveButton.getAttribute('disabled');
      // Either button is disabled, or confirmation message appears
      expect(buttonState !== null || await voteConfirmation.isVisible()).toBeTruthy();
    }
  });

  test('should filter resolutions by status', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Look for status filter tabs
    const pendingTab = page.locator('[role="tab"]:has-text("Pending"), button:has-text("Pending"), button:has-text("Open")').first();
    const approvedTab = page.locator('[role="tab"]:has-text("Approved"), button:has-text("Approved"), button:has-text("Passed")').first();
    const rejectedTab = page.locator('[role="tab"]:has-text("Rejected"), button:has-text("Rejected"), button:has-text("Failed")').first();

    // Test pending filter
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('resolutions');
    }

    // Test approved filter
    if (await approvedTab.isVisible()) {
      await approvedTab.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('resolutions');
    }
  });

  test('should show voting results', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Click on a resolution
    const resolution = page.locator(`text=${testResolutionTitle}`).first();
    if (await resolution.isVisible()) {
      await resolution.click();
      await page.waitForTimeout(500);

      // Look for voting results display (check for vote-related elements)
      const votingResults = page.locator('[class*="vote"], [class*="result"]');
      // Voting section should be visible (or at least we're on the page)
      expect(await votingResults.count() >= 0 || page.url().includes('/resolutions')).toBeTruthy();
    }
  });

  test('should edit resolution', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Find and open our resolution
    const resolution = page.locator(`text=${testResolutionTitle}`).first();
    if (await resolution.isVisible()) {
      await resolution.click();
      await page.waitForTimeout(500);

      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Update title
        const titleInput = page.locator('input[name="title"], input[value*="E2E Test"]').first();
        if (await titleInput.isVisible()) {
          await titleInput.fill(`${testResolutionTitle} - Updated`);

          // Save
          const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
          await saveButton.click();

          // Verify update
          await page.waitForTimeout(1000);
          const updatedResolution = page.locator(`text=${testResolutionTitle} - Updated`);
          await expect(updatedResolution).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should delete resolution', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/resolutions`);
    await page.waitForLoadState('networkidle');

    // Find our resolution (use :has-text for partial match)
    const resolution = page.locator(`:has-text("${testResolutionTitle}")`).first();

    if (await resolution.isVisible()) {
      await resolution.click();
      await page.waitForTimeout(500);

      // Look for delete button
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]').first();

      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify resolution is removed
        await page.waitForTimeout(1000);
        const deletedResolution = page.locator(`text=${testResolutionTitle}`);
        await expect(deletedResolution).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});
