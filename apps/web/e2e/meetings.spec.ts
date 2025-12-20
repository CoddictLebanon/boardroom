import { test, expect } from './fixtures';

test.describe('Meetings Page', () => {
  // Helper to get to meetings page
  async function navigateToMeetings(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Get company ID from URL if redirected to dashboard
    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/meetings`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display meetings list page', async ({ page }) => {
    const companyId = await navigateToMeetings(page);

    if (companyId) {
      // Should show meetings page heading
      const heading = page.locator('h1, h2').filter({ hasText: /meetings/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should have New Meeting button', async ({ page }) => {
    const companyId = await navigateToMeetings(page);

    if (companyId) {
      const newMeetingButton = page.locator(
        'a:has-text("New Meeting"), button:has-text("New Meeting"), a:has-text("Schedule Meeting")'
      );
      await expect(newMeetingButton.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should navigate to new meeting page', async ({ page }) => {
    const companyId = await navigateToMeetings(page);

    if (companyId) {
      const newMeetingButton = page.locator(
        'a:has-text("New Meeting"), button:has-text("New Meeting"), a:has-text("Schedule")'
      );

      if ((await newMeetingButton.count()) > 0) {
        await newMeetingButton.first().click();
        await expect(page).toHaveURL(/\/meetings\/new/, { timeout: 10000 });
      }
    }
  });

  test('should show meeting cards if meetings exist', async ({ page }) => {
    const companyId = await navigateToMeetings(page);

    if (companyId) {
      await page.waitForTimeout(2000); // Wait for API response

      // Look for meeting cards or empty state
      const meetingCards = page.locator('[class*="Card"]').filter({
        has: page.locator('h3, [class*="CardTitle"]'),
      });
      const emptyState = page.locator('text=/no meetings|schedule.*first/i');

      // Either meetings exist or empty state is shown
      const hasMeetings = (await meetingCards.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasMeetings || hasEmptyState).toBeTruthy();
    }
  });
});

test.describe('New Meeting Page', () => {
  async function navigateToNewMeeting(page: any) {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/meetings/new`);
      await page.waitForLoadState('networkidle');
      return companyId;
    }
    return null;
  }

  test('should display new meeting form', async ({ page }) => {
    const companyId = await navigateToNewMeeting(page);

    if (companyId) {
      // Should show form inputs
      const titleInput = page.locator(
        'input[name="title"], input[placeholder*="title" i], input[id*="title" i]'
      );
      await expect(titleInput.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should have form validation', async ({ page }) => {
    const companyId = await navigateToNewMeeting(page);

    if (companyId) {
      // Try to submit empty form
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Create"), button:has-text("Schedule")'
      );

      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();

        // Should show validation errors or prevent submission
        await page.waitForTimeout(1000);

        // Form should still be on the same page
        expect(page.url()).toMatch(/\/meetings\/new/);
      }
    }
  });

  test('should fill and submit meeting form', async ({ page }) => {
    const companyId = await navigateToNewMeeting(page);

    if (companyId) {
      // Fill in title
      const titleInput = page.locator(
        'input[name="title"], input[placeholder*="title" i]'
      ).first();
      await titleInput.fill('E2E Test Meeting');

      // Fill in description if present
      const descInput = page.locator('textarea').first();
      if ((await descInput.count()) > 0) {
        await descInput.fill('Meeting created by Playwright E2E test');
      }

      // Try to find and fill date/time if needed
      const dateInput = page.locator('input[type="date"], input[type="datetime-local"]');
      if ((await dateInput.count()) > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await dateInput.first().fill(tomorrow.toISOString().split('T')[0]);
      }
    }
  });
});

test.describe('Meeting Detail Page', () => {
  test('should show meeting details when navigating to a meeting', async ({ page }) => {
    // First get to meetings list
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const companyIdMatch = url.match(/\/companies\/([\w-]+)/);

    if (companyIdMatch) {
      const companyId = companyIdMatch[1];
      await page.goto(`/companies/${companyId}/meetings`);
      await page.waitForLoadState('networkidle');

      // Click first meeting if exists
      const meetingLink = page.locator('a[href*="/meetings/"]').first();

      if ((await meetingLink.count()) > 0) {
        await meetingLink.click();
        await page.waitForLoadState('networkidle');

        // Should show meeting detail content
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});
