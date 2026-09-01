import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: (process.env.E2E_API_URL ?? 'http://localhost:3001/api').replace(/\/?$/, '/'), trace: 'retain-on-failure' },
  outputDir: 'test-results',
});
