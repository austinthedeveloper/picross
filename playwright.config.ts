import { defineConfig } from '@playwright/test';

/**
 * Browser tests on a phone-sized touch screen (the game is phone-first): every
 * spec against the production build, and `debug.spec.ts` against a dev build with
 * the debug tools (#65). Locally they use your installed Chrome; CI installs
 * Playwright's Chromium. Run with `npm run e2e`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    // Skips animations, which keeps the tests fast and steady.
    reducedMotion: 'reduce',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'prod', testIgnore: 'debug.spec.ts' },
    { name: 'dev', testMatch: 'debug.spec.ts', use: { baseURL: 'http://localhost:4174/' } },
  ],
  webServer: [
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run build:dev && npx vite preview --outDir dist-dev --port 4174 --strictPort',
      url: 'http://localhost:4174/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
