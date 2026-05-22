import { test, expect } from '../fixtures/base';

test.describe('Full Happy Path', () => {
  test('login page supports switching methods and navigation to register', async ({ page }) => {
    await page.goto('/login');

    const codeTab = page.getByRole('button', { name: '验证码登录' });
    const passwordTab = page.getByRole('button', { name: '密码登录' });

    await expect(codeTab).toBeVisible();
    await expect(passwordTab).toBeVisible();

    await passwordTab.click();
    await expect(page.getByPlaceholder('请输入密码')).toBeVisible();

    await codeTab.click();
    await expect(page.getByPlaceholder('输入图形验证码')).toBeVisible();

    await page.getByRole('link', { name: '去注册' }).click();
    await page.waitForURL(/\/register/);
    await expect(page.getByRole('button', { name: '注册' })).toBeVisible();
  });
});
