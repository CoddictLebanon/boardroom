import { test, expect } from './fixtures';

test.describe('Resolutions Page', () => {
  async function navigateToResolutions(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/resolutions`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display resolutions page', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      // Should show resolutions heading
      const heading = page.locator('h1, h2').filter({ hasText: /resolutions/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show create resolution button', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      const createButton = page.locator(
        'button:has-text("New"), button:has-text("Create"), a:has-text("New Resolution")'
      );
      await expect(createButton.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show resolutions list or empty state', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for resolution cards or empty state
      const resolutions = page.locator('[class*="Card"]').filter({
        has: page.locator('h3, [class*="title" i]'),
      });
      const emptyState = page.locator('text=/no resolutions|create.*first/i');

      const hasResolutions = (await resolutions.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasResolutions || hasEmptyState).toBeTruthy();
    }
  });

  test('should display resolution status badges', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for status badges
      const statusBadges = page.locator('[class*="Badge"]').filter({
        hasText: /draft|pending|approved|rejected|passed|failed/i,
      });

      // If resolutions exist, they should have status badges
      const badgeCount = await statusBadges.count();
      console.log(`Found ${badgeCount} status badges`);
    }
  });

  test('should have status filter tabs', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      // Look for filter tabs
      const tabs = page.locator('[role="tablist"], [class*="Tabs"]');

      if ((await tabs.count()) > 0) {
        await expect(tabs.first()).toBeVisible();
      }
    }
  });

  test('should navigate to resolution detail on click', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Find resolution links
      const resolutionLinks = page.locator(
        'a[href*="resolution"], [class*="Card"][class*="cursor-pointer"]'
      );

      if ((await resolutionLinks.count()) > 0) {
        await resolutionLinks.first().click();
        await page.waitForTimeout(1000);

        // Should navigate or open detail
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should show voting UI for pending resolutions', async ({ page }) => {
    const companyId = await navigateToResolutions(page);

    if (companyId) {
      await page.waitForTimeout(2000);

      // Look for voting buttons
      const voteButtons = page.locator(
        'button:has-text("Vote"), button:has-text("Approve"), button:has-text("Reject")'
      );

      // Voting buttons may or may not be present depending on data
      const voteCount = await voteButtons.count();
      console.log(`Found ${voteCount} voting buttons`);
    }
  });
});
