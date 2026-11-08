#!/usr/bin/env node
/**
 * Screenshots a page of the running dev server (npm run dev) in your installed Chrome.
 *
 *   node scripts/screenshot.mjs '#/play/mug' shot.png [--phone] [--dark] [--js 'code']
 *
 * --js runs in the page after it loads (and after a short wait), for setting things up.
 * In dev builds the play screen puts its Game and BlockView on window.__game and __view.
 */
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const [hash = '#/', out = 'shot.png'] = args.filter(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--js' && args[i - 1] !== '--base',
);
const phone = args.includes('--phone');
const base = option('--base') ?? 'http://localhost:5174/';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: phone ? { width: 390, height: 844 } : { width: 1100, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: args.includes('--dark') ? 'dark' : 'light',
  hasTouch: phone,
  isMobile: phone,
});
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(base + hash);
await page.waitForTimeout(800);
const js = option('--js');
if (js) {
  await page.evaluate(js);
  await page.waitForTimeout(600);
}
await page.screenshot({ path: out, fullPage: args.includes('--full') });
await browser.close();
console.log(`wrote ${out}`);
