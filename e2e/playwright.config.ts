import { defineConfig, devices } from '@playwright/test';

// Optional: use a preinstalled Chromium instead of the one managed by Playwright.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const launchOptions = executablePath ? { executablePath } : {};

// WebKit (mobile Safari layout) runs in CI. Locally it is skipped unless
// PW_WEBKIT=1, because it needs `npx playwright install webkit`.
const withWebkit = !!process.env.CI || process.env.PW_WEBKIT === '1';

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: '../playwright-report' }],
      ]
    : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    launchOptions,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
    {
      name: 'mobile',
      // iPhone 13 emulation (viewport, touch, user agent) running on Chromium
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        launchOptions,
      },
    },
    ...(withWebkit
      ? [
          {
            name: 'mobile-webkit',
            // iPhone 13 on real WebKit: closest to Safari iOS layout
            use: { ...devices['iPhone 13'] },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
