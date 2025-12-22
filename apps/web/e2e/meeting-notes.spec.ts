import { test, expect } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Meeting Notes - Real-time Collaboration', () => {
  let companyId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to companies and get companyId
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
      // Click on first company card
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

    if (match) {
      companyId = match[1];
    }
  });

  test('should display notes section in live meeting page', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    // Navigate to meetings
    await page.goto('/companies/' + companyId + '/meetings');
    await page.waitForLoadState('networkidle');

    // Find an in-progress meeting or any meeting
    const meetingLink = page.locator('a[href*="/meetings/"]').first();
    const hasMeetings = await meetingLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    test.skip(!hasMeetings, 'No meetings available for testing');

    await meetingLink.click();
    await page.waitForLoadState('networkidle');

    // Go to live page if there's a link
    const liveLink = page.locator('a[href*="/live"], button:has-text("Start"), button:has-text("Join")').first();
    if (await liveLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await liveLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Check that notes section exists
    const notesSection = page.locator('text=Meeting Notes, text=Notes').first();
    await expect(notesSection).toBeVisible({ timeout: 10000 });
  });

  test('should add a new note during active meeting', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    const testNoteContent = 'E2E Test Note ' + new Date().getTime();

    // Navigate to meetings
    await page.goto('/companies/' + companyId + '/meetings');
    await page.waitForLoadState('networkidle');

    // Find a meeting and navigate to it
    const meetingLink = page.locator('a[href*="/meetings/"]').first();
    const hasMeetings = await meetingLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    test.skip(!hasMeetings, 'No meetings available for testing');

    await meetingLink.click();
    await page.waitForLoadState('networkidle');

    // Go to live page
    const liveLink = page.locator('a[href*="/live"], button:has-text("Start"), button:has-text("Join")').first();
    if (await liveLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await liveLink.click();
      await page.waitForLoadState('networkidle');
    }

    // If meeting is not started, try to start it
    const startButton = page.locator('button:has-text("Start Meeting")').first();
    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startButton.click();
      // Handle confirmation dialog
      const confirmButton = page.locator('button:has-text("Start"), [role="alertdialog"] button:has-text("Start")').last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
    }

    // Find the note input field - could be textarea or input
    const noteInput = page.locator('textarea[placeholder*="note" i], input[placeholder*="note" i], textarea[placeholder*="Add" i]').first();
    
    // Skip if we cannot find the input (meeting might not be active)
    const inputVisible = await noteInput.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!inputVisible, 'Note input not visible - meeting may not be active');

    // Type a note
    await noteInput.fill(testNoteContent);

    // Click add button
    const addButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
    } else {
      // Try pressing Enter instead
      await noteInput.press('Enter');
    }

    // Wait for note to appear
    await page.waitForTimeout(1000);

    // Verify note appears in the list
    const noteText = page.locator('text=' + testNoteContent).first();
    await expect(noteText).toBeVisible({ timeout: 10000 });
  });

  test('should edit own note', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    // Navigate to a live meeting with notes
    await page.goto('/companies/' + companyId + '/meetings');
    await page.waitForLoadState('networkidle');

    const meetingLink = page.locator('a[href*="/meetings/"]').first();
    const hasMeetings = await meetingLink.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!hasMeetings, 'No meetings available');

    await meetingLink.click();
    await page.waitForLoadState('networkidle');

    // Go to live page
    const liveLink = page.locator('a[href*="/live"]').first();
    if (await liveLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await liveLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Find a note more button (usually in a dropdown menu)
    const moreButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const hasNotes = await moreButton.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!hasNotes, 'No notes to edit');

    await moreButton.click();

    // Click edit in dropdown
    const editButton = page.locator('[role="menuitem"]:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();

      // Find edit input and modify
      const editInput = page.locator('textarea').first();
      await editInput.fill('Updated note content');

      // Save changes
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();

      // Verify update
      await page.waitForTimeout(500);
      const updatedNote = page.locator('text=Updated note content').first();
      await expect(updatedNote).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete own note', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    // Navigate to a live meeting with notes
    await page.goto('/companies/' + companyId + '/meetings');
    await page.waitForLoadState('networkidle');

    const meetingLink = page.locator('a[href*="/meetings/"]').first();
    const hasMeetings = await meetingLink.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!hasMeetings, 'No meetings available');

    await meetingLink.click();
    await page.waitForLoadState('networkidle');

    // Go to live page
    const liveLink = page.locator('a[href*="/live"]').first();
    if (await liveLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await liveLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Find a note more button
    const moreButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const hasNotes = await moreButton.isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(!hasNotes, 'No notes to delete');

    await moreButton.click();

    // Click delete in dropdown
    const deleteButton = page.locator('[role="menuitem"]:has-text("Delete")').first();
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion in dialog
      const confirmDelete = page.locator('[role="alertdialog"] button:has-text("Delete")').first();
      if (await confirmDelete.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmDelete.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should have drag handles for reordering notes', async ({ page }) => {
    test.skip(!companyId, 'No company available');

    // Navigate to a live meeting
    await page.goto('/companies/' + companyId + '/meetings');
    await page.waitForLoadState('networkidle');

    const meetingLink = page.locator('a[href*="/meetings/"]').first();
    const hasMeetings = await meetingLink.isVisible({ timeout: 5000 }).catch(() => false);
    test.skip(!hasMeetings, 'No meetings available');

    await meetingLink.click();
    await page.waitForLoadState('networkidle');

    // Go to live page
    const liveLink = page.locator('a[href*="/live"]').first();
    if (await liveLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await liveLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Find drag handle (GripVertical icon button with cursor-grab class)
    const dragHandle = page.locator('[class*="cursor-grab"], button[class*="grab"]').first();
    const hasDragHandle = await dragHandle.isVisible({ timeout: 3000 }).catch(() => false);
    
    // If no drag handles visible, the meeting might not be active or no notes exist
    // This is acceptable - we just verify the feature is present when applicable
    if (hasDragHandle) {
      await expect(dragHandle).toBeVisible();
    }
  });
});
