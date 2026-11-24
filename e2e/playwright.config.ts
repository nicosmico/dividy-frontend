import { defineConfig, devices } from '@playwright/test';

// Port of the preview server; set PW_PORT to run two suites at once without sharing a build.
const PORT = Number(process.env.PW_PORT ?? 4173);

// Optional: use a preinstalled Chromium instead of the one managed by Playwright.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const launchOptions = executablePath ? { executablePath } : {};

// WebKit (mobile Safari layout) runs in CI. Locally it is skipped unless
// PW_WEBKIT=1, because it needs `npx playwright install webkit`.
const withWebkit = !!process.env.CI || process.env.PW_WEBKIT === '1';

// Visual baselines live in two folders. `baseline` is what CI compares against
// (rendered inside the official Playwright Docker image, see docs/testing.md).
// With PW_CHROMIUM_PATH (a Chromium that is not the one CI uses) the images go
// to `local`, which is git-ignored, so they can never be committed by mistake.
const snapshotFolder = executablePath ? 'local' : 'baseline';

// The `visual` project exists only when asked for (`--project=visual`, which
// is what `npm run test:visual` does, or PW_VISUAL=1), so a plain
// `npm run test:e2e` never runs the screenshots. Workers re-read this config,
// hence the environment variable (it is inherited by them).
const argv = process.argv;
if (
  argv.includes('--project=visual') ||
  argv.some((arg, i) => arg === '--project' && argv[i + 1] === 'visual')
) {
  process.env.PW_VISUAL = '1';
}
const withVisual = process.env.PW_VISUAL === '1';

// Only the `visual` project runs this spec, and it runs nothing else.
const VISUAL_SPEC = /visual\.spec\.ts$/;

export default defineConfig({
  testDir: '.',
  snapshotPathTemplate: `{testDir}/__screenshots__/${snapshotFolder}/{arg}{ext}`,
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
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    launchOptions,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: VISUAL_SPEC,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'mobile',
      testIgnore: VISUAL_SPEC,
      // iPhone 13 emulation (viewport, touch, user agent) running on Chromium
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
        launchOptions,
      },
    },
    ...(withVisual
      ? [
          {
            // Visual regression (e2e/visual.spec.ts). Everything that can change a
            // pixel is fixed: size, scale, motion, locale and time zone. Run it in
            // the Playwright Docker image (docs/testing.md).
            name: 'visual',
            testMatch: VISUAL_SPEC,
            retries: 0,
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 390, height: 844 },
              deviceScaleFactor: 1,
              reducedMotion: 'reduce' as const,
              locale: 'es-CL',
              timezoneId: 'America/Santiago',
              launchOptions,
            },
          },
        ]
      : []),
    ...(withWebkit
      ? [
          {
            name: 'mobile-webkit',
            testIgnore: VISUAL_SPEC,
            // iPhone 13 on real WebKit: closest to Safari iOS layout
            use: { ...devices['iPhone 13'] },
          },
        ]
      : []),
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
