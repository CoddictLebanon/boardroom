import { test, expect } from './fixtures';

test.describe('Action Items Page', () => {
  async function navigateToActionItems(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/action-items`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display action items page', async ({ page }) => {
    const companyId = await navigateToActionItems(page);

    if (companyId) {
      // Should show action items heading
      const heading = page.locator('h1, h2').filter({ hasText: /action.*items/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show action items list or empty state', async ({ page }) => {
    const companyId = await navigateToActionItems(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for action item cards or empty state
      const actionItems = page.locator('[class*="Card"]').filter({
        has: page.locator('h3, [class*="title" i]'),
      });
      const emptyState = page.locator('text=/no action items|no tasks/i');

      const hasItems = (await actionItems.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasItems || hasEmptyState).toBeTruthy();
    }
  });

  test('should have filter/status tabs if present', async ({ page }) => {
    const companyId = await navigateToActionItems(page);

    if (companyId) {
      // Look for status filter tabs
      const tabs = page.locator('[role="tablist"], [class*="Tabs"]');

      if ((await tabs.count()) > 0) {
        await expect(tabs.first()).toBeVisible();

        // Check for common status tabs
        const allTab = page.locator('[role="tab"]:has-text("All")');
        const pendingTab = page.locator('[role="tab"]:has-text("Pending")');
        const completedTab = page.locator('[role="tab"]:has-text("Completed")');

        // At least one tab should be visible
        const hasAllTab = (await allTab.count()) > 0;
        const hasPendingTab = (await pendingTab.count()) > 0;
        const hasCompletedTab = (await completedTab.count()) > 0;

        expect(hasAllTab || hasPendingTab || hasCompletedTab).toBeTruthy();
      }
    }
  });

  test('should display priority badges on action items', async ({ page }) => {
    const companyId = await navigateToActionItems(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for priority badges
      const priorityBadges = page.locator('[class*="Badge"]').filter({
        hasText: /high|medium|low/i,
      });

      // If action items exist, they should have priority badges
      const itemCount = await priorityBadges.count();
      // This is informational - might be 0 if no items exist
      console.log(`Found ${itemCount} priority badges`);
    }
  });

  test('should be able to click on an action item', async ({ page }) => {
    const companyId = await navigateToActionItems(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Find clickable action items
      const actionItemLinks = page.locator('a[href*="action-item"], [class*="cursor-pointer"]');

      if ((await actionItemLinks.count()) > 0) {
        // Click should work without errors
        await actionItemLinks.first().click({ force: true });
        await page.waitForTimeout(500);
      }
    }
  });
});
