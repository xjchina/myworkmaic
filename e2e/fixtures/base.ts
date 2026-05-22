import { test as base } from '@playwright/test';
import { MockApi } from './mock-api';

type Fixtures = {
  mockApi: MockApi;
};

export const test = base.extend<Fixtures>({
  mockApi: async ({ page }, use) => {
    const mockApi = new MockApi(page);
    // Always mock auth/session + server providers called on app boot.
    await mockApi.mockAuthMe();
    await mockApi.mockServerProviders();
    await use(mockApi);
  },
});

export { expect } from '@playwright/test';
