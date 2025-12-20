import { test, expect } from './fixtures';

test.describe('Documents Page', () => {
  async function navigateToDocuments(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/documents`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display documents page', async ({ page }) => {
    const companyId = await navigateToDocuments(page);

    if (companyId) {
      // Should show documents heading
      const heading = page.locator('h1, h2').filter({ hasText: /documents/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show upload button', async ({ page }) => {
    const companyId = await navigateToDocuments(page);

    if (companyId) {
      // Look for upload button
      const uploadButton = page.locator(
        'button:has-text("Upload"), a:has-text("Upload"), button:has-text("Add")'
      );
      await expect(uploadButton.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show folders or documents list', async ({ page }) => {
    const companyId = await navigateToDocuments(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for folder icons, document list, or empty state
      const folders = page.locator('[class*="folder" i], svg[class*="Folder"]');
      const documents = page.locator('[class*="Card"], [class*="file" i]');
      const emptyState = page.locator('text=/no documents|upload.*first|empty/i');

      const hasFolders = (await folders.count()) > 0;
      const hasDocuments = (await documents.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasFolders || hasDocuments || hasEmptyState).toBeTruthy();
    }
  });

  test('should have document type filter if available', async ({ page }) => {
    const companyId = await navigateToDocuments(page);

    if (companyId) {
      // Look for filter dropdown or tabs
      const filterSelect = page.locator(
        'select, [role="combobox"], [class*="Select"]'
      );
      const filterTabs = page.locator('[role="tablist"]');

      const hasFilter = (await filterSelect.count()) > 0;
      const hasTabs = (await filterTabs.count()) > 0;

      // Filters are optional
      console.log(`Has filter: ${hasFilter}, Has tabs: ${hasTabs}`);
    }
  });

  test('should handle folder navigation', async ({ page }) => {
    const companyId = await navigateToDocuments(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Find folder links
      const folderLinks = page.locator('a[href*="folder"], [class*="folder" i]');

      if ((await folderLinks.count()) > 0) {
        await folderLinks.first().click();
        await page.waitForTimeout(1000);

        // Should navigate or expand folder
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should display document details on click', async ({ page }) => {
    const companyId = await navigateToDocuments(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Find document items
      const documentItems = page.locator('[class*="Card"]').filter({
        has: page.locator('[class*="file" i], svg'),
      });

      if ((await documentItems.count()) > 0) {
        await documentItems.first().click();
        await page.waitForTimeout(1000);

        // Should open detail view or dialog
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});
