import { defineConfig } from '@playwright/test';

/**
 * Browser tests on a phone-sized touch screen against the production build. Locally they
 * use your installed Chrome; CI installs Playwright's Chromium. Run with `npm run e2e`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4175/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    // The offline cache would hold pages between tests; e2e/offline.spec.ts turns it on.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4175 --strictPort',
    url: 'http://localhost:4175/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
