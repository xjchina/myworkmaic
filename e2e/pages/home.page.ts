import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly quickStartLink: Locator;
  readonly classroomCard: Locator;
  readonly exerciseCard: Locator;
  readonly roundtableCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.quickStartLink = page.getByRole('link', { name: '快速开始' });
    this.classroomCard = page.getByRole('link', { name: /教案课堂/ });
    this.exerciseCard = page.getByRole('link', { name: /互动练习/ });
    this.roundtableCard = page.getByRole('link', { name: /圆桌讨论/ });
  }

  async goto() {
    await this.page.goto('/');
  }
}
