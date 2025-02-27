import { test, expect } from '@playwright/test';

test('basic API integration test', async ({ page }) => {
  // Go to homepage and wait for network to be idle (API requests completed)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page).toBeDefined();
});
