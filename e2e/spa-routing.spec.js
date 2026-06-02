import { test, expect } from '@playwright/test';

test.describe('SPA routing (refresh / deep links)', () => {
  test('protected dashboard route does not show static 404', async ({ page }) => {
    await page.goto('/dashboard/shop-settings');
    await expect(page.getByText('Page not found')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /login to orderbase|shop settings/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('billing deep link loads app shell', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.getByText('Page not found')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /login to orderbase|billing/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('templates deep link loads app shell', async ({ page }) => {
    await page.goto('/dashboard/templates');
    await expect(page.getByText('Page not found')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /login to orderbase|templates/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
