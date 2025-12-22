import { test, expect } from './fixtures';

test('debug forms', async ({ page }) => {
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
  
  // Debug Action Items create form
  console.log('\n=== ACTION ITEMS CREATE FORM ===');
  await page.goto(`/companies/${companyId}/action-items`);
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("New Action Item")');
  await page.waitForTimeout(1000);
  
  const actionInputs = await page.locator('input, textarea').all();
  console.log('Inputs found:', actionInputs.length);
  for (const input of actionInputs) {
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    console.log(`  Input: name=${name}, placeholder=${placeholder}, type=${type}`);
  }
  
  // Debug Resolutions create form
  console.log('\n=== RESOLUTIONS CREATE FORM ===');
  await page.goto(`/companies/${companyId}/resolutions`);
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("New Resolution")');
  await page.waitForTimeout(1000);
  
  const resInputs = await page.locator('input, textarea').all();
  console.log('Inputs found:', resInputs.length);
  for (const input of resInputs) {
    const name = await input.getAttribute('name');
    const placeholder = await input.getAttribute('placeholder');
    const type = await input.getAttribute('type');
    console.log(`  Input: name=${name}, placeholder=${placeholder}, type=${type}`);
  }
  
  expect(true).toBe(true);
});
