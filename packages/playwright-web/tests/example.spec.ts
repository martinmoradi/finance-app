import { test, expect } from '@playwright/test';

test('basic API integration test', async ({ page }) => {
  // Go to the homepage
  await page.goto('/');

  // The API base URL is configured in your Next.js environment
  // and the fetch is made from the client side
  await expect(page.getByText('Hello World')).toBeVisible({ timeout: 10000 });
});
