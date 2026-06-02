import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestUser } from './helpers/auth.js';

test.describe('Products form (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD in environment');
    await loginAsTestUser(page);
    await page.goto('/dashboard/products');
    await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  test('add product modal keeps save button visible in footer', async ({ page }) => {
    await page.getByRole('button', { name: 'Add product' }).click();
    await expect(page.getByRole('heading', { name: 'Add product', level: 2 })).toBeVisible();

    const saveButton = page.getByRole('button', { name: 'Save product' });
    await expect(saveButton).toBeVisible();

    await page.getByLabel('Name').fill('E2E Test Product');
    await page.getByLabel('Category').fill('Test');
    await page.getByLabel('Price').fill('100');
    await page.getByLabel('Stock').fill('5');

    await saveButton.scrollIntoViewIfNeeded();
    const box = await saveButton.boundingBox();
    const viewport = page.viewportSize();
    expect(box).toBeTruthy();
    expect(box.y + box.height).toBeLessThanOrEqual((viewport?.height || 844) + 2);
  });
});
