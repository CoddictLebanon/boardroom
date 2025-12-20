import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Authentication setup for Playwright tests with Clerk
 *
 * OPTIONS:
 *
 * 1. REAL CREDENTIALS (for local testing):
 *    - Create a test user in Clerk Dashboard
 *    - Set environment variables:
 *      export PLAYWRIGHT_TEST_EMAIL="your-test-user@example.com"
 *      export PLAYWRIGHT_TEST_PASSWORD="your-test-password"
 *
 * 2. MANUAL LOGIN (for debugging):
 *    - Run: npm run test:headed
 *    - Sign in manually once
 *    - Auth state is saved for subsequent runs
 *
 * 3. CLERK TESTING TOKEN (for CI - recommended):
 *    - Get testing token from Clerk Dashboard > API Keys
 *    - Set: export CLERK_TESTING_TOKEN="your-testing-token"
 */
setup('authenticate', async ({ page, context }) => {
  // Option 1: Use Clerk Testing Token (best for CI)
  const clerkTestingToken = process.env.CLERK_TESTING_TOKEN;
  if (clerkTestingToken) {
    console.log('🔑 Using Clerk Testing Token for authentication');

    // Set the testing token as a cookie
    await context.addCookies([
      {
        name: '__clerk_testing_token',
        value: clerkTestingToken,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Navigate to trigger Clerk to recognize the token
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Save auth state
    await page.context().storageState({ path: authFile });
    console.log('✅ Clerk Testing Token authentication set up');
    return;
  }

  // Option 2: Use real credentials
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    console.log('');
    console.log('⚠️  No test credentials provided.');
    console.log('');
    console.log('   To run authenticated tests, set one of:');
    console.log('');
    console.log('   Option A - Real Clerk user:');
    console.log('     export PLAYWRIGHT_TEST_EMAIL="your-test@example.com"');
    console.log('     export PLAYWRIGHT_TEST_PASSWORD="your-password"');
    console.log('');
    console.log('   Option B - Clerk Testing Token (recommended for CI):');
    console.log('     export CLERK_TESTING_TOKEN="your-token"');
    console.log('');
    console.log('   Skipping authentication - tests requiring auth will fail.');
    console.log('');

    // Create empty auth state
    await page.context().storageState({ path: authFile });
    return;
  }

  console.log(`🔐 Signing in as ${testEmail}...`);

  // Navigate to sign-in page
  await page.goto('/sign-in');

  // Wait for Clerk's sign-in component to load (not Google's OAuth widget)
  await page.waitForSelector('.cl-rootBox, .cl-card, [data-clerk-component]', {
    timeout: 15000,
  });

  // Target Clerk's identifier input specifically (within Clerk's component)
  // Clerk uses input[name="identifier"] for email/username
  const clerkForm = page.locator('.cl-rootBox, .cl-card, [data-clerk-component]').first();
  const emailInput = clerkForm.locator('input[name="identifier"]');

  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(testEmail);

  // Click Clerk's primary form button (not Google's social button)
  const continueButton = clerkForm.locator('.cl-formButtonPrimary');
  await continueButton.click();

  // Wait for password field to appear (Clerk shows password after email verification)
  const passwordInput = clerkForm.locator('input[name="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(testPassword);

  // Click the continue/submit button
  const submitButton = clerkForm.locator('.cl-formButtonPrimary');
  await submitButton.click();

  // Wait for successful authentication - should redirect away from sign-in
  await expect(page).not.toHaveURL(/sign-in/, { timeout: 15000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });

  console.log('✅ Authentication successful, state saved.');
});
