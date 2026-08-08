import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4325';
const localBrowser = process.env.CI ? {} : { channel: 'chrome' as const };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], ...localBrowser },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'], ...localBrowser },
    },
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4325',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
