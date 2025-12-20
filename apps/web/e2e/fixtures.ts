import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for BoardMeeting E2E tests
 */
export const test = base.extend<{
  /** Navigate to a company page */
  companyPage: (companyId: string, path?: string) => Promise<void>;
}>({
  companyPage: async ({ page }, use) => {
    const navigate = async (companyId: string, path: string = '') => {
      await page.goto(`/companies/${companyId}${path}`);
    };
    await use(navigate);
  },
});

export { expect };

/**
 * Test data helpers
 */
export const testData = {
  company: {
    name: 'Test Company E2E',
    description: 'Company for E2E testing',
  },
  meeting: {
    title: 'Q4 Board Meeting',
    description: 'Quarterly review meeting',
    location: 'Virtual',
  },
  actionItem: {
    title: 'Review Q4 financials',
    description: 'Complete review of Q4 financial statements',
  },
  resolution: {
    title: 'Approve Q4 Budget',
    description: 'Resolution to approve the Q4 budget allocation',
  },
};

/**
 * Wait for API response
 */
export async function waitForApi(page: any, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response: any) =>
      (typeof urlPattern === 'string'
        ? response.url().includes(urlPattern)
        : urlPattern.test(response.url())) && response.status() === 200
  );
}

/**
 * Get text content safely
 */
export async function getTextContent(page: any, selector: string): Promise<string> {
  const element = page.locator(selector).first();
  return (await element.textContent()) || '';
}
