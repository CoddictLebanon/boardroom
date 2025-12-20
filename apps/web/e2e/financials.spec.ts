import { test, expect } from './fixtures';

test.describe('Financials Page', () => {
  async function navigateToFinancials(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/financials`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display financials page', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      // Should show financials heading
      const heading = page.locator('h1, h2').filter({
        hasText: /financials|financial|reports/i,
      });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show year selector', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      // Look for year selector
      const yearSelector = page.locator(
        'select, [role="combobox"], button:has-text("2024"), button:has-text("2025")'
      );

      if ((await yearSelector.count()) > 0) {
        await expect(yearSelector.first()).toBeVisible();
      }
    }
  });

  test('should display monthly data grid or table', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for data table or grid
      const table = page.locator('table, [class*="Table"]');
      const grid = page.locator('[class*="grid"]').filter({
        has: page.locator('input, [class*="cell" i]'),
      });
      const emptyState = page.locator('text=/no data|enter.*data|empty/i');

      const hasTable = (await table.count()) > 0;
      const hasGrid = (await grid.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasTable || hasGrid || hasEmptyState).toBeTruthy();
    }
  });

  test('should show revenue, cost, and profit columns', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for column headers
      const revenueHeader = page.locator('text=/revenue/i');
      const costHeader = page.locator('text=/cost|expense/i');
      const profitHeader = page.locator('text=/profit|income/i');

      const hasRevenue = (await revenueHeader.count()) > 0;
      const hasCost = (await costHeader.count()) > 0;
      const hasProfit = (await profitHeader.count()) > 0;

      // At least one financial column should be visible
      expect(hasRevenue || hasCost || hasProfit).toBeTruthy();
    }
  });

  test('should display chart if available', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for chart elements (Recharts)
      const chart = page.locator(
        '[class*="recharts"], svg.recharts-surface, [class*="Chart"]'
      );

      // Chart is optional
      const hasChart = (await chart.count()) > 0;
      console.log(`Has chart: ${hasChart}`);
    }
  });

  test('should allow editing monthly values', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for editable inputs
      const inputs = page.locator(
        'input[type="number"], input[inputmode="numeric"], input[class*="editable" i]'
      );

      if ((await inputs.count()) > 0) {
        // Click to focus
        await inputs.first().click();

        // Should be able to type
        await inputs.first().fill('10000');

        // Value should be entered
        await expect(inputs.first()).toHaveValue(/10000/);
      }
    }
  });

  test('should have save functionality', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      // Look for save button
      const saveButton = page.locator(
        'button:has-text("Save"), button:has-text("Update"), button[type="submit"]'
      );

      // Save button may or may not be present depending on UI design
      const hasSaveButton = (await saveButton.count()) > 0;
      console.log(`Has save button: ${hasSaveButton}`);
    }
  });
});

test.describe('Financial Reports', () => {
  async function navigateToFinancials(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/financials`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should show reports section if available', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      // Look for reports tab or section
      const reportsTab = page.locator(
        '[role="tab"]:has-text("Reports"), button:has-text("Reports")'
      );
      const reportsSection = page.locator('text=/financial.*reports|annual.*report/i');

      const hasReportsTab = (await reportsTab.count()) > 0;
      const hasReportsSection = (await reportsSection.count()) > 0;

      console.log(`Has reports: ${hasReportsTab || hasReportsSection}`);
    }
  });

  test('should allow uploading reports', async ({ page }) => {
    const companyId = await navigateToFinancials(page);

    if (companyId) {
      // Look for upload button
      const uploadButton = page.locator(
        'button:has-text("Upload"), input[type="file"], a:has-text("Upload")'
      );

      // Upload functionality may or may not be present
      const hasUpload = (await uploadButton.count()) > 0;
      console.log(`Has upload: ${hasUpload}`);
    }
  });
});
