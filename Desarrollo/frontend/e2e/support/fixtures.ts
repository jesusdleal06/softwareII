import { test as base, expect, request, type APIRequestContext } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8091';

export const test = base.extend<{ api: APIRequestContext }>({
  api: async ({}, use) => {
    const context = await request.newContext({ baseURL: API_URL });
    await use(context);
    await context.dispose();
  },
});

export { expect };
