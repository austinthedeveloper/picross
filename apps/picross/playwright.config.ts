import { defineConfig } from '@playwright/test';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

/**
 * Browser tests on a phone-sized touch screen (the game is phone-first): every
 * spec against the production build, and `debug.spec.ts` against a dev build with
 * the debug tools (#65). Picross Cubed's are in `e2e/cubed/` (project `cubed`, or
 * `npm run e2e:cubed`). Locally they use your installed Chrome; CI installs
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
    // No service workers (the game's offline one, src/offline/): each test starts from the
    // network, and a worker can't hold pages between tests. e2e/offline.spec.ts turns them on.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'prod', testIgnore: [/debug\.spec\.ts$/, /\/cubed\//] },
    {
      name: 'cubed',
      testMatch: /\/cubed\/.*\.spec\.ts$/,
      testIgnore: /perf\.spec\.ts$/,
    },
    // Cubed's timing test runs alone after the rest, so other tests don't share the CPU it
    // times (to run just it: npm run e2e -- --project cubed-perf --no-deps).
    {
      name: 'cubed-perf',
      testMatch: /\/cubed\/perf\.spec\.ts$/,
      dependencies: ['prod', 'cubed'],
    },
    { name: 'dev', testMatch: /debug\.spec\.ts$/, use: { baseURL: 'http://localhost:4174/' } },
  ],
  // The servers run from the repo root, which builds into dist/ (and dist-dev/).
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      cwd: root,
      url: 'http://localhost:4173/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'npm run build:dev && npm run preview -- --outDir ../../dist-dev --port 4174 --strictPort',
      cwd: root,
      url: 'http://localhost:4174/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
