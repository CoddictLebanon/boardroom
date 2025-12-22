import { test, expect } from './fixtures';

test.describe('Live Meeting WebSocket', () => {
  test('debug websocket connection and decision creation', async ({ page }) => {
    // Navigate to companies and find a company
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
      const companyCard = page.locator('[class*="cursor-pointer"]').filter({
        has: page.locator('h3'),
      }).first();
      await companyCard.waitFor({ state: 'visible', timeout: 10000 });
      await companyCard.click({ timeout: 10000 });
      await page.waitForURL(/\/companies\/[\w-]+\/dashboard/, { timeout: 10000 });
      url = page.url();
      match = url.match(/\/companies\/([\w-]+)/);
    }

    const companyId = match![1];
    console.log('Company ID:', companyId);

    // Go to meetings page
    await page.goto(`/companies/${companyId}/meetings`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot to debug
    await page.screenshot({ path: 'test-results/meetings-page.png' });

    // Try multiple selectors for meeting rows
    let meetingLink = page.locator('a[href*="/meetings/"]').first();

    if (await meetingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found meeting link, clicking...');
      await meetingLink.click();
      await page.waitForURL(/\/companies\/[\w-]+\/meetings\/[\w-]+/, { timeout: 10000 });
    } else {
      console.log('No meeting links found, looking for table rows...');
      // Try clicking a table row
      const tableRow = page.locator('tbody tr').first();
      if (await tableRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tableRow.click();
        await page.waitForURL(/\/companies\/[\w-]+\/meetings\/[\w-]+/, { timeout: 10000 });
      } else {
        console.log('No meetings found - need to create one via UI');
        // Look for New Meeting or Schedule Meeting button
        const newMeetingBtn = page.locator('button').filter({ hasText: /new|schedule|create/i }).first();
        await page.screenshot({ path: 'test-results/no-meetings.png' });
        if (await newMeetingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('Found new meeting button:', await newMeetingBtn.textContent());
          await newMeetingBtn.click();
          await page.waitForTimeout(1000);

          // Fill meeting form
          const titleInput = page.locator('input').first();
          await titleInput.fill('WebSocket Test Meeting');

          // Submit
          const submitBtn = page.locator('button[type="submit"]').first();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForURL(/\/companies\/[\w-]+\/meetings\/[\w-]+/, { timeout: 15000 });
          }
        } else {
          console.log('ERROR: Cannot find any way to get to a meeting');
          await page.screenshot({ path: 'test-results/debug-meetings.png' });
          throw new Error('No meetings available and cannot create one');
        }
      }
    }

    // Get meeting ID from URL
    const meetingUrl = page.url();
    const meetingMatch = meetingUrl.match(/\/meetings\/([\w-]+)/);
    const meetingId = meetingMatch![1];
    console.log('Meeting ID:', meetingId);

    // Go to live meeting page
    await page.goto(`/companies/${companyId}/meetings/${meetingId}/live`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for WebSocket connection status in browser console
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      console.log(`Browser Console: ${msg.type()}: ${msg.text()}`);
    });

    // Check initial connection state
    const socketState = await page.evaluate(() => {
      // @ts-ignore
      const socket = window.__socket_debug;
      if (socket) {
        return {
          connected: socket.connected,
          disconnected: socket.disconnected,
          id: socket.id,
        };
      }
      return null;
    });
    console.log('Socket state:', socketState);

    // Check if meeting is IN_PROGRESS
    const meetingStatus = await page.locator('[class*="Badge"]').first().textContent();
    console.log('Meeting status:', meetingStatus);

    // If meeting is not started, start it
    if (meetingStatus?.includes('Ready to Start') || meetingStatus?.includes('Scheduled')) {
      console.log('Starting meeting...');
      const startButton = page.locator('button:has-text("Start Meeting")');
      if (await startButton.isVisible()) {
        await startButton.click();
        await page.waitForTimeout(500);
        // Confirm in dialog
        const confirmButton = page.locator('button:has-text("Start Meeting")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        await page.waitForTimeout(2000);
      }
    }

    // Check the decisions section
    const decisionsSection = page.locator('text=Decisions').first();
    await decisionsSection.scrollIntoViewIfNeeded();

    // Count initial decisions
    const initialDecisionCount = await page.locator('[class*="rounded-lg border p-4"]').filter({
      has: page.locator('[class*="Badge"]'),
    }).count();
    console.log('Initial decision count:', initialDecisionCount);

    // Try to add a decision
    const addDecisionBtn = page.locator('button:has-text("Add Decision")').first();
    if (await addDecisionBtn.isVisible()) {
      await addDecisionBtn.click();
      await page.waitForTimeout(500);

      // Fill in decision form
      await page.fill('input[id="decision-title"]', 'Test Decision for WebSocket');
      await page.fill('textarea[id="decision-description"]', 'Testing real-time updates');

      // Submit
      await page.click('button:has-text("Start Vote")');
      await page.waitForTimeout(2000);

      // Check if decision was added
      const newDecisionCount = await page.locator('[class*="rounded-lg border p-4"]').filter({
        has: page.locator('[class*="Badge"]'),
      }).count();
      console.log('New decision count:', newDecisionCount);

      // Check if WebSocket update was received
      const decisionAdded = newDecisionCount > initialDecisionCount;
      console.log('Decision added via WebSocket:', decisionAdded);

      // Also check if we needed a page refresh
      if (!decisionAdded) {
        console.log('WebSocket did not update - trying page refresh...');
        await page.reload();
        await page.waitForLoadState('networkidle');

        const afterRefreshCount = await page.locator('[class*="rounded-lg border p-4"]').filter({
          has: page.locator('[class*="Badge"]'),
        }).count();
        console.log('Decision count after refresh:', afterRefreshCount);
      }
    } else {
      console.log('Add Decision button not visible - meeting may not be active');
    }

    // Log all console messages at the end
    console.log('\n=== All Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));

    expect(true).toBe(true);
  });
});
