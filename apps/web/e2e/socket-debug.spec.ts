import { test, expect } from './fixtures';

test.describe('Socket Debug', () => {
  test('check socket connection on live meeting page', async ({ page }) => {
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.text().includes('[Socket]') || msg.text().includes('[MeetingSocket]')) {
        console.log('BROWSER:', text);
      }
    });

    // Navigate to 8bits company
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    // Find 8bits company card
    const companyCard = page.locator('[class*="cursor-pointer"]').filter({
      hasText: '8bits',
    }).first();

    if (await companyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found 8bits company, clicking...');
      await companyCard.click();
      await page.waitForURL(/\/companies\/[\w-]+\/dashboard/, { timeout: 10000 });
    } else {
      console.log('8bits not found, using first company...');
      const firstCompany = page.locator('[class*="cursor-pointer"]').filter({
        has: page.locator('h3'),
      }).first();
      await firstCompany.click();
      await page.waitForURL(/\/companies\/[\w-]+\/dashboard/, { timeout: 10000 });
    }

    // Get company ID
    const url = page.url();
    const match = url.match(/\/companies\/([\w-]+)/);
    const companyId = match![1];
    console.log('Company ID:', companyId);

    // Go to meetings page
    await page.goto(`/companies/${companyId}/meetings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find an IN_PROGRESS meeting or first available
    const inProgressBadge = page.locator('text=IN_PROGRESS').first();
    if (await inProgressBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found IN_PROGRESS meeting');
      // Click the row containing this badge
      const row = page.locator('tr').filter({ has: inProgressBadge }).first();
      await row.click();
    } else {
      console.log('No IN_PROGRESS meeting, clicking first meeting...');
      const firstMeetingLink = page.locator('tbody tr').first();
      if (await firstMeetingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstMeetingLink.click();
      } else {
        throw new Error('No meetings found');
      }
    }

    await page.waitForURL(/\/companies\/[\w-]+\/meetings\/[\w-]+/, { timeout: 10000 });

    // Get meeting ID
    const meetingUrl = page.url();
    const meetingMatch = meetingUrl.match(/\/meetings\/([\w-]+)/);
    const meetingId = meetingMatch![1];
    console.log('Meeting ID:', meetingId);

    // Go to live meeting page
    await page.goto(`/companies/${companyId}/meetings/${meetingId}/live`);
    await page.waitForLoadState('networkidle');

    // Wait for socket to connect
    console.log('Waiting for socket connection...');
    await page.waitForTimeout(5000);

    // Log all socket-related console messages
    console.log('\n=== Socket Console Messages ===');
    consoleMessages.forEach(msg => {
      if (msg.includes('[Socket]') || msg.includes('[MeetingSocket]') || msg.includes('error')) {
        console.log(msg);
      }
    });

    // Check the meeting status badge
    const statusBadge = await page.locator('[class*="Badge"]').first().textContent();
    console.log('Meeting status:', statusBadge);

    // If not active, try to start
    if (statusBadge?.includes('Ready') || statusBadge?.includes('Scheduled')) {
      console.log('Starting meeting...');
      const startBtn = page.locator('button:has-text("Start Meeting")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.locator('button:has-text("Start Meeting")').last();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
        await page.waitForTimeout(3000);
      }
    }

    // Wait more for socket events
    await page.waitForTimeout(3000);

    // Try adding a decision
    console.log('\nTrying to add a decision...');
    const addDecisionBtn = page.locator('button:has-text("Add Decision")').first();
    if (await addDecisionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addDecisionBtn.click();
      await page.waitForTimeout(500);

      // Fill decision form
      await page.fill('input[id="decision-title"]', `Test ${Date.now()}`);

      // Click Start Vote
      const submitBtn = page.locator('button:has-text("Start Vote")');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        console.log('Submitted decision...');
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('Add Decision button not visible');
    }

    // Final console dump
    console.log('\n=== Final Socket Messages ===');
    consoleMessages.forEach(msg => {
      if (msg.includes('[Socket]') || msg.includes('[MeetingSocket]')) {
        console.log(msg);
      }
    });

    // Take screenshot
    await page.screenshot({ path: 'test-results/socket-debug-final.png' });

    expect(true).toBe(true);
  });
});
