import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { GAME_NAME } from '../src/name';
import * as cubed from './cubed/helpers';
import { runAt, skipScene, solution, solve } from './helpers';

/*
 * The game offline (src/offline/): installing it, playing both boards and a story fight
 * with no network, a new version waiting for the player to leave the board, and Cubed's
 * old worker at /3d/ retiring. The other tests block service workers.
 */
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
const DIST = path.join(import.meta.dirname, '../../../dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** How the test's site behaves at the moment. */
interface Site {
  /** The old Cubed at /3d/ (its page for everything there, and its worker). */
  old?: boolean;
  /** No network: every request fails. */
  down?: boolean;
  /** A new version of the game is out: sw.js has changed. */
  next?: boolean;
}

/**
 * Serves dist/, as the site is at the moment (`state`). Playwright can't route a service
 * worker's own script, and its offline mode may not reach a worker's requests, so this is a
 * server of the test's own.
 */
async function serve(state: Site) {
  const server = http.createServer((req, res) => {
    if (state.down) return req.socket.destroy();
    let file = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
    if (state.old && file.startsWith('/3d/')) {
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
    if (state.next && file === path.join(DIST, 'sw.js')) {
      return res.end(`${fs.readFileSync(file, 'utf8')}\n// The next version.\n`);
    }
    fs.createReadStream(file).pipe(res);
  });
  await new Promise<void>((done) => server.listen(0, 'localhost', done));
  return {
    base: `http://localhost:${(server.address() as AddressInfo).port}`,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}

/** Every file the worker caches, in the end: all of the build but the workers and .vite/. */
const CACHED = (fs.readdirSync(DIST, { recursive: true }) as string[]).filter((file) => {
  const name = file.split(path.sep).join('/');
  return (
    fs.statSync(path.join(DIST, file)).isFile() &&
    name !== 'sw.js' &&
    name !== '3d/sw.js' &&
    !name.startsWith('.vite/')
  );
}).length;

/** How many files the game's cache holds. */
const cacheSize = (page: Page) =>
  page.evaluate(async () => {
    const name = (await caches.keys()).find((n) => n.startsWith('picross-app-'));
    return name ? (await (await caches.open(name)).keys()).length : 0;
  });

/** Waits for the game's worker to be in charge of the page. */
const controlled = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null);

test('installable, and it plays offline: both boards and a story fight on each', async ({
  page,
  context,
}) => {
  const state: Site = {};
  const { base, close } = await serve(state);
  try {
    await page.goto(`${base}/#/`);
    const manifest = await page.evaluate(async () => {
      const link = document.querySelector<HTMLLinkElement>('link[rel=manifest]')!;
      return (await fetch(link.href)).json();
    });
    expect(manifest).toMatchObject({ name: GAME_NAME, display: 'standalone', start_url: './' });
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    await expect(page).toHaveTitle(GAME_NAME);

    // A first visit: the worker takes over, with the game precached. One block, as a
    // player opens one, brings three.js and every screen with a block.
    await controlled(page);
    await page.goto(`${base}/#/cubed/play/steps`);
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
    await expect.poll(() => cacheSize(page), { timeout: 30_000 }).toBe(CACHED);

    // No network from here.
    state.down = true;
    await context.setOffline(true);
    await page.goto(`${base}/#/`);
    await page.reload();
    await expect(page.locator('.card').first()).toBeVisible();

    // Free play, flat.
    await page.goto(`${base}/#/play/heart`);
    await solve(page, solution('heart'));
    await expect(page.locator('.end-panel:not([hidden]) h2')).toHaveText('Solved!');

    // Free play, Cubed, opening straight onto the block.
    await page.goto(`${base}/#/cubed/play/steps`);
    await page.reload();
    const steps = cubed.puzzle('steps');
    await cubed.focusBlock(page);
    await cubed.breakCubes(page, steps, cubed.extras(steps));
    await expect(page.getByRole('heading', { name: 'Solved!' })).toBeVisible();

    // A story fight in each game, from a saved run (a new query makes it a real page load).
    await page.evaluate((run) => localStorage.setItem('picross:run', JSON.stringify(run)), {
      current: runAt('first-job', 2),
      seenScenes: ['first-job-intro'],
      jobs: {},
    });
    await page.goto(`${base}/?fight#/run/play`);
    await skipScene(page);
    await expect(page.locator('.battle')).toBeVisible();
    await expect(page.locator('.cell').first()).toBeVisible();

    // Cubed's run lives in the one run save, under `block` (#155). It's seeded before the
    // page's scripts run: leaving the 2D fight saves that run over anything written now.
    await page.addInitScript(
      (block) => {
        if (location.search !== '?cubed-fight') return;
        const save = JSON.parse(localStorage.getItem('picross:run') ?? '{}');
        localStorage.setItem('picross:run', JSON.stringify({ ...save, block }));
      },
      {
        current: {
          runId: 'first-job',
          node: 0,
          hp: 12,
          maxHp: 12,
          gadgets: [],
          status: 'active',
          mode: 'relaxed',
          tally: { mistakes: 0, hintsUsed: 0, gadgetsUsed: 0 },
        },
      },
    );
    await page.goto(`${base}/?cubed-fight#/cubed/story/play`);
    await cubed.skipScene(page);
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
    await expect(page.locator('.enemy-hp')).toBeVisible();
  } finally {
    await context.setOffline(false);
    close();
  }
});

test('a new version waits until the player is off the board, then Reload brings it in', async ({
  page,
}) => {
  const state: Site = {};
  const { base, close } = await serve(state);
  try {
    await page.goto(`${base}/#/`);
    await controlled(page);
    // Mid-puzzle when the new version comes out.
    await page.goto(`${base}/#/play/heart`);
    await expect(page.locator('.cell').first()).toBeVisible();
    state.next = true;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await page.waitForFunction(async () =>
      Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
    );
    const bar = page.locator('.update-bar');
    await expect(bar).toBeHidden();

    // Back on the list: the bar, and Reload hands over to the new version.
    await page.goto(`${base}/#/`);
    await expect(bar).toContainText('A new version is ready');
    await page.evaluate(() => Object.assign(window, { before: true }));
    const reloaded = page.waitForEvent('load');
    await bar.getByRole('button', { name: 'Reload' }).click();
    await reloaded;
    expect(await page.evaluate(() => 'before' in window)).toBe(false);
    await expect(bar).toBeHidden();
    expect(
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.waiting),
    ).toBeNull();
    await expect(page).toHaveURL(`${base}/#/`);
  } finally {
    close();
  }
});

test("Cubed's old offline worker retires, and its pages land in the one app", async ({ page }) => {
  // A player who had the old Cubed: its page and worker at /3d/, and its cache.
  const state: Site = { old: true };
  const { base, close } = await serve(state);
  try {
    await page.goto(`${base}/3d/#/play/steps`);
    await expect(page.getByRole('heading', { name: 'The old Cubed' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => caches.has('picross-cubed'))).toBe(true);

    // Coming back after the update: the old worker still answers first, with the old page,
    // and the browser finds /3d/sw.js is now the one that retires it.
    state.old = false;
    await page.reload();
    await expect(page).toHaveURL(`${base}/#/cubed/play/steps`);
    await expect(page.locator('canvas.block-canvas')).toBeVisible();
    // The one app's worker, at the root, is the only one left.
    await controlled(page);
    const scopes = await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope),
    );
    expect(scopes).toEqual([`${base}/`]);
    expect(await page.evaluate(() => caches.has('picross-cubed'))).toBe(false);
  } finally {
    close();
  }
});
