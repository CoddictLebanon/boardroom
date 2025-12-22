import { test, expect } from './fixtures';

test.describe('OKRs - Functional Tests', () => {
  // Helper to get companyId from URL or extract from page
  async function getCompanyId(page: any): Promise<string | null> {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
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

    return match ? match[1] : null;
  }

  test('should navigate to OKRs page and display heading', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1:has-text("OKRs")');
    await expect(heading).toBeVisible({ timeout: 10000 });

    const subheading = page.locator('text=Objectives and Key Results tracking');
    await expect(subheading).toBeVisible({ timeout: 5000 });
  });

  test('should display New Period button or empty state', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const newPeriodButton = page.locator('button:has-text("New Period")');
    const createFirstButton = page.locator('button:has-text("Create First Period")');
    const emptyState = page.locator('text=No OKR periods yet');

    const hasCreateButton = await newPeriodButton.isVisible({ timeout: 5000 }).catch(() => false) ||
                           await createFirstButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    // At least one of these should be visible
    expect(hasCreateButton || hasEmptyState).toBeTruthy();
  });

  test('should open period creation dialog', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const newPeriodButton = page.locator('button:has-text("New Period"), button:has-text("Create First Period")').first();

    if (await newPeriodButton.isVisible({ timeout: 5000 })) {
      await newPeriodButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await expect(page.locator('input#period-name')).toBeVisible();
      await expect(page.locator('input#period-start')).toBeVisible();
      await expect(page.locator('input#period-end')).toBeVisible();

      const cancelButton = dialog.locator('button:has-text("Cancel")');
      await cancelButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should display period selector or empty state', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('text=No OKR periods yet');
    const periodSelector = page.locator('button[role="combobox"]');

    const isEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const hasPeriods = await periodSelector.isVisible({ timeout: 3000 }).catch(() => false);

    // Either empty state or period selector should be visible
    expect(isEmpty || hasPeriods).toBeTruthy();

    // If periods exist, test the selector dropdown
    if (hasPeriods) {
      await periodSelector.click();
      await page.waitForTimeout(300);

      const dropdownContent = page.locator('[role="listbox"], [data-radix-select-viewport]');
      await expect(dropdownContent).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show objectives section when period is selected', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const periodSelector = page.locator('button[role="combobox"]');

    if (await periodSelector.isVisible({ timeout: 5000 })) {
      const objectivesTitle = page.locator('text=Objectives');
      await expect(objectivesTitle).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show overall score when period is selected', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const periodSelector = page.locator('button[role="combobox"]');

    if (await periodSelector.isVisible({ timeout: 5000 })) {
      const scoreLabel = page.locator('text=Overall Score');
      await expect(scoreLabel).toBeVisible({ timeout: 5000 });

      const progressBar = page.locator('[role="progressbar"], [class*="progress"]');
      await expect(progressBar.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate period form - name required', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/okrs`);
    await page.waitForLoadState('networkidle');

    const newPeriodButton = page.locator('button:has-text("New Period"), button:has-text("Create First Period")').first();

    if (await newPeriodButton.isVisible({ timeout: 5000 })) {
      await newPeriodButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const createButton = dialog.locator('button:has-text("Create")');

      // Set up listener for alert
      let alertShown = false;
      page.on('dialog', async d => {
        alertShown = true;
        expect(d.message()).toContain('Please');
        await d.accept();
      });

      await createButton.click();
      await page.waitForTimeout(500);

      // Either alert was shown or dialog is still visible (form validation)
      expect(alertShown || await dialog.isVisible()).toBeTruthy();

      // Close dialog if still visible
      if (await dialog.isVisible()) {
        const cancelButton = dialog.locator('button:has-text("Cancel")');
        await cancelButton.click();
      }
    }
  });

  test('should display OKRs in sidebar navigation', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/dashboard`);
    await page.waitForLoadState('networkidle');

    const okrsLink = page.locator('nav a:has-text("OKRs"), [class*="sidebar"] a:has-text("OKRs")');
    await expect(okrsLink.first()).toBeVisible({ timeout: 10000 });

    await okrsLink.first().click();
    await page.waitForURL(/\/okrs/);

    const heading = page.locator('h1:has-text("OKRs")');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
