import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestUser } from './helpers/auth.js';

test.describe('Template screenshots', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasE2ECredentials(), 'Set E2E_EMAIL and E2E_PASSWORD in environment');
    await loginAsTestUser(page);
    await page.goto('/dashboard/templates');
    await expect(page.getByRole('heading', { name: 'Templates', level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  test('premade templates show desktop and mobile screenshot assets', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Order form templates', level: 2 })).toBeVisible();
    const cleanDesktop = page.getByRole('img', { name: /clean desktop preview/i });
    await expect(cleanDesktop).toBeVisible();
    await expect(cleanDesktop).toHaveAttribute('src', /\/templates\/clean-desktop\.svg/);
    await expect(page.getByRole('img', { name: /clean mobile preview/i })).toBeVisible();
  });

  test('demo button opens public order form when shop slug exists', async ({ page, context }) => {
    const demoButton = page.getByRole('button', { name: 'Demo' }).first();
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      demoButton.click(),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/shop\//);
    await popup.close();
  });
});
