#!/usr/bin/env node
/**
 * Renders the app icons (public/icons/*.png) from public/favicon.svg in your installed
 * Chrome. Run after changing the icon: node scripts/icons.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(ROOT, 'public/favicon.svg'), 'utf8');
mkdirSync(join(ROOT, 'public/icons'), { recursive: true });

// Maskable icons keep their art inside the middle 80%, on the page color.
const ICONS = [
  { file: 'icon-192.png', size: 192, pad: 0.06 },
  { file: 'icon-512.png', size: 512, pad: 0.06 },
  { file: 'maskable-512.png', size: 512, pad: 0.2 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.12 },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
for (const { file, size, pad } of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<body style="margin:0;background:#f6f3ec;display:grid;place-items:center;height:100vh">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div></body>`,
  );
  await page.screenshot({ path: join(ROOT, 'public/icons', file) });
  console.log(`wrote public/icons/${file}`);
}
await browser.close();
