import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: [['list']],
  outputDir: './.tmp/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:12168',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    { name: 'mobile-chromium', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
    { name: 'desktop-chromium', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 12168',
    url: 'http://127.0.0.1:12168/geriatric-lung-cancer-care/api/health',
    reuseExistingServer: true,
    timeout: 60000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
