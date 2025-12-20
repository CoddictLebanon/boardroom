import { test, expect } from './fixtures';

test.describe('Companies Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to companies page
    await page.goto('/companies');
  });

  test('should show company picker or redirect', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should either show company picker or redirect to dashboard
    const currentUrl = page.url();

    if (currentUrl.includes('/companies') && !currentUrl.includes('/dashboard')) {
      // On company picker page
      const heading = page.locator('h1');
      await expect(heading).toBeVisible({ timeout: 10000 });

      // Should show either "Select a Company" or "No Companies Yet"
      const headingText = await heading.textContent();
      expect(
        headingText?.includes('Select a Company') ||
          headingText?.includes('No Companies Yet')
      ).toBeTruthy();
    } else {
      // Redirected to dashboard (user has only one company)
      expect(currentUrl).toMatch(/\/companies\/[\w-]+\/dashboard/);
    }
  });

  test('should display company cards when multiple companies exist', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // If on company picker with multiple companies
    const companyCards = page.locator('[class*="cursor-pointer"]').filter({
      has: page.locator('h3'),
    });

    const cardCount = await companyCards.count();
    if (cardCount > 0) {
      // Should be able to click a company card
      await expect(companyCards.first()).toBeVisible();
    }
  });

  test('should navigate to dashboard when clicking a company', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find company cards
    const companyCards = page.locator('[class*="cursor-pointer"]').filter({
      has: page.locator('h3'),
    });

    const cardCount = await companyCards.count();
    if (cardCount > 0) {
      // Click the first company
      await companyCards.first().click();

      // Should navigate to dashboard
      await expect(page).toHaveURL(/\/companies\/[\w-]+\/dashboard/, {
        timeout: 10000,
      });
    }
  });
});

test.describe('Company Dashboard', () => {
  test('should display dashboard stats cards', async ({ page }) => {
    // Navigate directly to a company dashboard
    // Note: This test assumes there's at least one company
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Wait for redirect or find dashboard
    const currentUrl = page.url();

    if (currentUrl.includes('/dashboard')) {
      // Already on dashboard
      await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({
        timeout: 10000,
      });

      // Check for stats cards
      const statsCards = page.locator('[class*="Card"]').filter({
        has: page.locator('[class*="CardTitle"]'),
      });

      await expect(statsCards.first()).toBeVisible();
    }
  });

  test('should show New Meeting button', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      const newMeetingButton = page.locator('a:has-text("New Meeting"), button:has-text("New Meeting")');
      await expect(newMeetingButton).toBeVisible();
    }
  });

  test('should display upcoming meetings section', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      const meetingsSection = page.locator('text=Upcoming Meetings');
      await expect(meetingsSection).toBeVisible();
    }
  });

  test('should display action items section', async ({ page }) => {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      const actionItemsSection = page.locator('text=My Action Items');
      await expect(actionItemsSection).toBeVisible();
    }
  });
});
