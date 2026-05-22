import { test, expect } from '../fixtures/base';

test.describe('Home Navigation', () => {
  test('unauthenticated user is guided to login page', async ({ page }) => {
    await page.goto('/');

    await page.waitForURL(/\/login/);
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '去注册' })).toBeVisible();
  });
});
