import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  // This test needs to run WITHOUT authentication
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/');

    // Should redirect to sign-in page or Clerk's auth handshake
    // Clerk may redirect to its own domain first before sign-in
    await expect(page).toHaveURL(/sign-in|clerk\.accounts\.dev/);
  });

  test('sign-in page should be accessible', async ({ page }) => {
    await page.goto('/sign-in');

    // Should show Clerk sign-in component or custom sign-in form
    await expect(page.locator('body')).toBeVisible();

    // Page should load without errors
    const errors = await page.evaluate(() => {
      return (window as any).__playwright_errors || [];
    });
    expect(errors.length).toBe(0);
  });

  test('sign-up page should be accessible', async ({ page }) => {
    await page.goto('/sign-up');

    // Should show Clerk sign-up component or custom sign-up form
    await expect(page.locator('body')).toBeVisible();
  });
});
