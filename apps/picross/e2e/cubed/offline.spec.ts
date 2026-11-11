import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

test.use({ serviceWorkers: 'allow' });

/**
 * Cubed's old service worker (its public/sw.js when it was its own app at /3d/): every file
 * it loaded kept in one cache, served from there and refreshed in the background.
 */
const OLD_WORKER = `
const CACHE = 'picross-cubed';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const key = request.mode === 'navigate' ? './index.html' : request;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: request.mode === 'navigate' });
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(key, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? fresh;
    }),
  );
});
`;
/** The old app's page, as far as the worker cares: it registers the worker. */
const OLD_PAGE = `<!doctype html><title>Picross Cubed</title><h1>The old Cubed</h1>
<script>navigator.serviceWorker.register('./sw.js')</script>`;

/** The build the other tests run against (the web server builds it first). */
const DIST = path.join(import.meta.dirname, '../../../../dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * The site before and after the update: serves dist/, but while `old()` the old Cubed at
 * /3d/ (its page for everything there, and its worker). Playwright can't route a service
 * worker's own script, so this is a server of the test's own.
 */
function site(old: () => boolean) {
  return http.createServer((req, res) => {
    let file = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
    if (old() && file.startsWith('/3d/')) {
      const worker = file === '/3d/sw.js';
      res.writeHead(200, { 'content-type': worker ? 'text/javascript' : 'text/html' });
      return res.end(worker ? OLD_WORKER : OLD_PAGE);
    }
    if (file.endsWith('/')) file += 'index.html';
    file = path.join(DIST, file);
    if (!file.startsWith(DIST) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

test("Cubed's old offline worker retires, and its pages land in the one app", async ({ page }) => {
  // A player who had the old Cubed: its page and worker at /3d/, and its cache.
  let old = true;
  const server = site(() => old);
  await new Promise<void>((done) => server.listen(0, 'localhost', done));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  try {
    await page.goto(`${base}/3d/#/play/steps`);
    await expect(page.getByRole('heading', { name: 'The old Cubed' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => caches.has('picross-cubed'))).toBe(true);

    // Coming back after the update: the old worker still answers first, with the old page,
    // and the browser finds /3d/sw.js is now the one that retires it.
    old = false;
    await page.reload();
    await expect(page).toHaveURL(`${base}/#/cubed/play/steps`);
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
    expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations())).toHaveLength(0);
    expect(await page.evaluate(() => caches.has('picross-cubed'))).toBe(false);
  } finally {
    server.close();
  }
});

// The one app's own offline worker comes with #160, which brings this test back for both
// boards (it was Cubed's, against its worker at /3d/).
test.fixme('installable, and it opens offline after a first visit', async ({ page, context }) => {
  await page.goto('/#/cubed');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel=manifest]')!;
    return (await fetch(link.href)).json();
  });
  expect(manifest).toMatchObject({ name: 'Picross Cubed', display: 'standalone' });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toContain('512x512');
  // Wait for the service worker to take over, then visit the screens that load more code.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.goto('/#/cubed/play/steps');
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  await page.goto('/#/cubed');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Picross Cubed' })).toBeVisible();
  await page.locator('.puzzle-card').first().click();
  await expect(page.locator('canvas.block-canvas')).toBeVisible();
  await context.setOffline(false);
});
