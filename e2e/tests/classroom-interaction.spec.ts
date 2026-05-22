import { test, expect } from '../fixtures/base';

test.describe('Classroom Interaction', () => {
  test('protected classroom route redirects to login', async ({ page }) => {
    await page.goto('/classroom/demo-sets');

    await page.waitForURL(/\/login/);
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  });
});
