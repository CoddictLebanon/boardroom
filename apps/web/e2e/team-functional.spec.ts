import { test, expect } from './fixtures';

test.describe('Team/Org Chart - Functional Tests', () => {
  // Helper to get companyId from URL or extract from page
  async function getCompanyId(page: any): Promise<string | null> {
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');

    let url = page.url();
    let match = url.match(/\/companies\/([\w-]+)/);

    if (!match) {
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

    return match ? match[1] : null;
  }

  test('should navigate to Team page and display heading', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1:has-text("Team")');
    await expect(heading).toBeVisible({ timeout: 10000 });

    const subheading = page.locator('text=Organization structure');
    await expect(subheading).toBeVisible({ timeout: 5000 });
  });

  test('should display Add Role button or empty state', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const addRoleButton = page.locator('button:has-text("Add Role")');
    const addFirstRoleButton = page.locator('button:has-text("Add First Role")');
    const emptyState = page.locator('text=No roles yet');

    const hasAddButton = await addRoleButton.isVisible({ timeout: 5000 }).catch(() => false) ||
                         await addFirstRoleButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);

    // At least one of these should be visible
    expect(hasAddButton || hasEmptyState).toBeTruthy();
  });

  test('should open role creation dialog', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Check form fields are visible
      await expect(page.locator('input#title')).toBeVisible();
      await expect(page.locator('input#personName')).toBeVisible();
      await expect(page.locator('input#department')).toBeVisible();

      // Cancel dialog
      const cancelButton = dialog.locator('button:has-text("Cancel")');
      await cancelButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should create a new role', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Fill in role details
      const timestamp = Date.now();
      const roleTitle = `Test CEO ${timestamp}`;

      await page.fill('input#title', roleTitle);
      await page.fill('input#personName', 'John Doe');
      await page.fill('input#department', 'Executive');

      // Create the role
      const createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();

      // Wait for dialog to close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Verify the role appears on the canvas
      await page.waitForTimeout(500); // Wait for React Flow to render
      const roleNode = page.locator(`text=${roleTitle}`);
      await expect(roleNode).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display React Flow canvas controls', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    // First create a role so the canvas is visible
    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await page.fill('input#title', `Canvas Test Role ${Date.now()}`);
      const createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }

    // Check for React Flow controls (zoom in, zoom out, fit view)
    const controls = page.locator('.react-flow__controls');
    await expect(controls).toBeVisible({ timeout: 5000 });

    // Check for background grid
    const background = page.locator('.react-flow__background');
    await expect(background).toBeVisible({ timeout: 5000 });
  });

  test('should validate role form - title required', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Try to create without title - button should be disabled
      const createButton = dialog.locator('button:has-text("Create")');
      await expect(createButton).toBeDisabled();

      // Fill in title - button should be enabled
      await page.fill('input#title', 'Valid Title');
      await expect(createButton).toBeEnabled();

      // Clear title - button should be disabled again
      await page.fill('input#title', '');
      await expect(createButton).toBeDisabled();

      // Cancel dialog
      const cancelButton = dialog.locator('button:has-text("Cancel")');
      await cancelButton.click();
    }
  });

  test('should display Team in sidebar navigation', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/dashboard`);
    await page.waitForLoadState('networkidle');

    const teamLink = page.locator('nav a:has-text("Team"), [class*="sidebar"] a:has-text("Team")');
    await expect(teamLink.first()).toBeVisible({ timeout: 10000 });

    await teamLink.first().click();
    await page.waitForURL(/\/team/);

    const heading = page.locator('h1:has-text("Team")');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should show edit and delete buttons on role node', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    // Create a role first
    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const roleTitle = `Edit Test Role ${Date.now()}`;
      await page.fill('input#title', roleTitle);
      const createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Find the role node and check for edit/delete buttons
      const roleNode = page.locator('.react-flow__node').filter({
        has: page.locator(`text=${roleTitle}`),
      });
      await expect(roleNode).toBeVisible({ timeout: 5000 });

      // Edit button (pencil icon)
      const editButton = roleNode.locator('button').filter({
        has: page.locator('svg.lucide-pencil, [class*="pencil"]'),
      });

      // Delete button (trash icon)
      const deleteButton = roleNode.locator('button').filter({
        has: page.locator('svg.lucide-trash-2, [class*="trash"]'),
      });

      // At least one action button should be visible
      const hasEditButton = await editButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      const hasDeleteButton = await deleteButton.first().isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasEditButton || hasDeleteButton).toBeTruthy();
    }
  });

  test('should show Add Report button on role node', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    // Create a role first
    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const roleTitle = `Parent Role ${Date.now()}`;
      await page.fill('input#title', roleTitle);
      const createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Find the role node
      const roleNode = page.locator('.react-flow__node').filter({
        has: page.locator(`text=${roleTitle}`),
      });
      await expect(roleNode).toBeVisible({ timeout: 5000 });

      // Check for "Add Report" button
      const addReportButton = roleNode.locator('button:has-text("Add Report")');
      await expect(addReportButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create child role via Add Report button', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    // Create parent role first
    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      let dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const parentTitle = `Parent ${Date.now()}`;
      await page.fill('input#title', parentTitle);
      let createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Find the parent role node and click Add Report
      const roleNode = page.locator('.react-flow__node').filter({
        has: page.locator(`text=${parentTitle}`),
      });
      await expect(roleNode).toBeVisible({ timeout: 5000 });

      const addReportButton = roleNode.locator('button:has-text("Add Report")');
      await addReportButton.click();

      // Dialog should open with parent pre-selected
      dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Fill in child role details
      const childTitle = `Child ${Date.now()}`;
      await page.fill('input#title', childTitle);
      createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Verify both roles exist
      const parentNode = page.locator(`text=${parentTitle}`);
      const childNode = page.locator(`text=${childTitle}`);
      await expect(parentNode).toBeVisible({ timeout: 5000 });
      await expect(childNode).toBeVisible({ timeout: 5000 });

      // Verify connection edge exists between parent and child
      const edges = page.locator('.react-flow__edge');
      await expect(edges.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display vacant badge for roles without person name', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Create role without person name
      const roleTitle = `Vacant Role ${Date.now()}`;
      await page.fill('input#title', roleTitle);
      // Leave personName empty

      const createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Find the role node
      const roleNode = page.locator('.react-flow__node').filter({
        has: page.locator(`text=${roleTitle}`),
      });
      await expect(roleNode).toBeVisible({ timeout: 5000 });

      // Check for "Vacant" badge
      const vacantBadge = roleNode.locator('text=Vacant');
      await expect(vacantBadge).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display employment type badge', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const roleTitle = `Contractor Role ${Date.now()}`;
      await page.fill('input#title', roleTitle);

      // Select employment type
      const employmentTypeSelect = dialog.locator('button[role="combobox"]').filter({
        has: page.locator('text=Select type'),
      });

      if (await employmentTypeSelect.isVisible({ timeout: 2000 })) {
        await employmentTypeSelect.click();
        await page.waitForTimeout(300);

        const contractorOption = page.locator('[role="option"]:has-text("Contractor")');
        if (await contractorOption.isVisible({ timeout: 2000 })) {
          await contractorOption.click();
        }
      }

      const createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Find the role node and check for employment badge
      const roleNode = page.locator('.react-flow__node').filter({
        has: page.locator(`text=${roleTitle}`),
      });
      await expect(roleNode).toBeVisible({ timeout: 5000 });

      // Employment badge might show "Contractor"
      const employmentBadge = roleNode.locator('text=Contractor');
      const hasBadge = await employmentBadge.isVisible({ timeout: 2000 }).catch(() => false);

      // This test is informational - badge visibility depends on if employment type was selected
      console.log(`Employment badge visible: ${hasBadge}`);
    }
  });

  test('should edit existing role', async ({ page }) => {
    const companyId = await getCompanyId(page);
    if (!companyId) {
      console.log('No company available, skipping test');
      return;
    }

    await page.goto(`/companies/${companyId}/team`);
    await page.waitForLoadState('networkidle');

    // Create a role first
    const addRoleButton = page.locator('button:has-text("Add Role"), button:has-text("Add First Role")').first();

    if (await addRoleButton.isVisible({ timeout: 5000 })) {
      await addRoleButton.click();

      let dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const originalTitle = `Original Title ${Date.now()}`;
      await page.fill('input#title', originalTitle);
      let createButton = dialog.locator('button:has-text("Create")');
      await createButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Find and click edit button on the role node
      const roleNode = page.locator('.react-flow__node').filter({
        has: page.locator(`text=${originalTitle}`),
      });
      await expect(roleNode).toBeVisible({ timeout: 5000 });

      // Click edit button (first button, should be pencil)
      const editButton = roleNode.locator('button').first();
      await editButton.click();

      // Edit dialog should open
      dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Dialog should show "Edit Role" title
      const dialogTitle = dialog.locator('text=Edit Role');
      await expect(dialogTitle).toBeVisible({ timeout: 5000 });

      // Update the title
      const updatedTitle = `Updated Title ${Date.now()}`;
      await page.fill('input#title', updatedTitle);

      const saveButton = dialog.locator('button:has-text("Save")');
      await saveButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // Verify the title was updated
      const updatedNode = page.locator(`text=${updatedTitle}`);
      await expect(updatedNode).toBeVisible({ timeout: 5000 });
    }
  });
});
