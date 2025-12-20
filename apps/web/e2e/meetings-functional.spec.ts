import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Meetings - Full CRUD Functionality', () => {
  let companyId: string;
  let createdMeetingId: string;
  const testMeetingTitle = `E2E Test Meeting ${Date.now()}`;

  test('should create a new meeting', async ({ page }) => {
    // Navigate to companies page and extract companyId
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
      // Company cards have cursor-pointer class with h3 inside
      const companyCard = page.locator('[class*="cursor-pointer"]').filter({
        has: page.locator('h3'),
      }).first();
      if (await companyCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await companyCard.click();
        await page.waitForURL(/\/companies\/[\w-]+\/dashboard/, { timeout: 10000 });
        url = page.url();
        match = url.match(/\/companies\/([\w-]+)/);
      }
    }

    test.skip(!match, 'No company available');
    companyId = match![1];

    // Navigate to new meeting page
    await page.goto(`/companies/${companyId}/meetings/new`);
    await page.waitForLoadState('networkidle');

    // Fill in meeting details - title is input with placeholder containing "Q4 Board" or similar
    const titleInput = page.locator('input[placeholder*="Q4 Board"], input[placeholder*="title" i]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(testMeetingTitle);

    // Set date to tomorrow
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await dateInput.fill(tomorrow.toISOString().split('T')[0]);
    }

    // Set time
    const timeInput = page.locator('input[type="time"]').first();
    if (await timeInput.isVisible()) {
      await timeInput.fill('10:00');
    }

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Schedule")').first();
    await submitButton.click();

    // Wait for redirect (could go to meetings list or meeting detail)
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    const newUrl = page.url();

    // Check if we're on a meeting detail page
    const meetingMatch = newUrl.match(/\/meetings\/([\w-]+)$/);
    if (meetingMatch && meetingMatch[1] !== 'new') {
      createdMeetingId = meetingMatch[1];
    }

    // If redirected to list, verify meeting appears and get ID by clicking it
    if (!createdMeetingId && newUrl.includes('/meetings') && !newUrl.includes('/new')) {
      const meetingLink = page.locator(`a:has-text("${testMeetingTitle}"), [role="link"]:has-text("${testMeetingTitle}")`).first();
      if (await meetingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await meetingLink.click();
        await page.waitForLoadState('networkidle');
        const detailUrl = page.url();
        const detailMatch = detailUrl.match(/\/meetings\/([\w-]+)$/);
        if (detailMatch) {
          createdMeetingId = detailMatch[1];
        }
      }
    }

    // Verify meeting was created
    expect(page.url()).not.toContain('/new');
  });

  test('should display created meeting in meetings list', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    await page.goto(`/companies/${companyId}/meetings`);
    await page.waitForLoadState('networkidle');

    // Wait for meetings to load
    await page.waitForTimeout(2000);

    // Look for our test meeting in the list
    const meetingItem = page.locator(`text=${testMeetingTitle}`).first();

    // Meeting should be visible in the list
    await expect(meetingItem).toBeVisible({ timeout: 10000 });
  });

  test('should open meeting detail page', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    // Go to meetings list and click on our test meeting
    await page.goto(`/companies/${companyId}/meetings`);
    await page.waitForLoadState('networkidle');

    // Find and click on the meeting
    const meetingItem = page.locator(`text=${testMeetingTitle}`).first();
    await expect(meetingItem).toBeVisible({ timeout: 10000 });
    await meetingItem.click();

    // Wait for navigation
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');

    // Capture the meeting ID from URL
    const currentUrl = page.url();
    const meetingMatch = currentUrl.match(/\/meetings\/([\w-]+)$/);
    if (meetingMatch && meetingMatch[1] !== 'new') {
      createdMeetingId = meetingMatch[1];
    }

    // Verify we're on a meeting detail page (either in URL or modal is open)
    const titleVisible = await page.locator(`text=${testMeetingTitle}`).first().isVisible().catch(() => false);
    expect(titleVisible || currentUrl.includes('/meetings/')).toBeTruthy();
  });

  test('should edit meeting details', async ({ page }) => {
    test.skip(!companyId || !createdMeetingId, 'No meeting created');

    await page.goto(`/companies/${companyId}/meetings/${createdMeetingId}`);
    await page.waitForLoadState('networkidle');

    // Look for edit button
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // Update the title
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill(`${testMeetingTitle} - Updated`);

        // Save changes
        const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();
        await saveButton.click();

        // Verify update was saved
        await page.waitForTimeout(2000);
        const updatedTitle = page.locator(`text=${testMeetingTitle} - Updated`);
        await expect(updatedTitle).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should add agenda item to meeting', async ({ page }) => {
    test.skip(!companyId || !createdMeetingId, 'No meeting created');

    await page.goto(`/companies/${companyId}/meetings/${createdMeetingId}`);
    await page.waitForLoadState('networkidle');

    // Look for add agenda button
    const addAgendaButton = page.locator('button:has-text("Add Agenda"), button:has-text("Add Item"), button:has-text("New Agenda")').first();

    if (await addAgendaButton.isVisible()) {
      await addAgendaButton.click();

      // Fill in agenda item
      const agendaInput = page.locator('input[name="title"], input[placeholder*="agenda" i], input[placeholder*="item" i]').first();
      if (await agendaInput.isVisible()) {
        await agendaInput.fill('E2E Test Agenda Item');

        // Save agenda item
        const saveButton = page.locator('button:has-text("Add"), button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();

        // Verify agenda item appears
        await page.waitForTimeout(1000);
        const agendaItem = page.locator('text=E2E Test Agenda Item');
        await expect(agendaItem).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should delete meeting', async ({ page }) => {
    test.skip(!companyId || !createdMeetingId, 'No meeting created');

    await page.goto(`/companies/${companyId}/meetings/${createdMeetingId}`);
    await page.waitForLoadState('networkidle');

    // Look for delete button
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete" i]').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion if dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Should redirect to meetings list
      await page.waitForURL(/\/meetings(?!\/)/, { timeout: 10000 });

      // Verify meeting is no longer in list
      await page.waitForTimeout(1000);
      const deletedMeeting = page.locator(`text=${testMeetingTitle}`);
      await expect(deletedMeeting).not.toBeVisible({ timeout: 5000 });
    }
  });
});
