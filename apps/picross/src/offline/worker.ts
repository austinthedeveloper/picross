/**
 * The service worker: the game offline. `npm run build` bundles this into `sw.js` at the
 * site's root, with the build's file lists (scripts/pwaPlugin.js), so it's never served in dev.
 *
 * - Installing downloads the app shell, both packs, the story and the art into a cache of
 *   this version's own, and keeps what the player had cached lazily before (plan.ts).
 * - It doesn't take over from an older version by itself: the page shows "A new version is
 *   ready" when the player isn't at a board, and Reload sends `SKIP_WAITING` (updates.ts).
 * - Taking over deletes the older versions' caches.
 * - Requests are answered by plan.ts's `strategy`: pages from the network first, then the
 *   cache; precached files from the cache. The first block the player opens caches three.js
 *   and every other screen with a block (`lazyFiles`).
 */
import {
  cacheName,
  carryOver,
  isOldCache,
  lazyFiles,
  sitePath,
  strategy,
  type BuildInfo,
} from './plan';

/** Written in by the build (scripts/pwaPlugin.js). */
declare const __PICROSS_BUILD__: BuildInfo;
const BUILD = __PICROSS_BUILD__;

// The worker's types (lib "webworker") don't mix with the page's ("dom") in one project,
// so these are the parts this file uses.
interface WaitEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface RequestEvent extends WaitEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerScope {
  readonly registration: { readonly scope: string };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: 'install' | 'activate', listener: (event: WaitEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: RequestEvent) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
}

const worker = self as unknown as WorkerScope;
const CACHE = cacheName(BUILD);
const PRECACHED = new Set(BUILD.precache);
const scope = () => worker.registration.scope;
const url = (path: string) => new URL(path, scope()).href;
/** How long a page load waits for the network before it opens from the cache instead. */
const PAGE_WAIT = 3000;

worker.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // From the server, not the browser's HTTP cache, which may hold an older index.html.
      await cache.addAll(BUILD.precache.map((path) => new Request(url(path), { cache: 'reload' })));
      await keepUsed(cache);
    })(),
  );
});

/** Copies the lazily cached files the player has used into `cache` (plan.ts `carryOver`). */
async function keepUsed(cache: Cache): Promise<void> {
  const old: string[] = [];
  for (const name of await caches.keys()) {
    if (!isOldCache(name, CACHE)) continue;
    for (const request of await (await caches.open(name)).keys()) {
      const path = sitePath(request.url, scope());
      if (path !== null) old.push(path);
    }
  }
  const { copy, fetch } = carryOver(old, BUILD);
  // Best effort: a file that can't be had now is cached the next time it's used.
  await Promise.allSettled([
    ...copy.map(async (path) => {
      const response = await caches.match(url(path));
      if (response) await cache.put(url(path), response);
    }),
    ...fetch.map((path) => cache.add(url(path))),
  ]);
}

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => isOldCache(n, CACHE)).map((n) => caches.delete(n)));
      // A first visit's page is this version already: serve it now, so it's offline-ready
      // without a reload. (After an update the page asked for this, with Reload.)
      await worker.clients.claim();
    })(),
  );
});

worker.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void worker.skipWaiting();
});

worker.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const how = strategy(request.url, scope(), request.mode === 'navigate', PRECACHED);
  if (!how) return;
  if (how.kind === 'page') event.respondWith(page(request, how.fallback));
  else if (how.kind === 'cached') event.respondWith(cached(request));
  else event.respondWith(lazy(request, event));
});

/** A page load: the network, or the cached page when it fails or is slow. */
async function page(request: Request, fallback: string): Promise<Response> {
  const network = fetch(request);
  network.catch(() => {});
  const slow = new Promise<undefined>((done) => setTimeout(done, PAGE_WAIT));
  try {
    const response = await Promise.race([network, slow]);
    if (response) return response;
  } catch {
    // Offline: the cache.
  }
  return (await caches.match(url(fallback), { cacheName: CACHE })) ?? network;
}

async function cached(request: Request): Promise<Response> {
  return (await caches.match(request, { cacheName: CACHE })) ?? fetch(request);
}

/** A built file that isn't precached: from the cache once it's been used. */
async function lazy(request: Request, event: WaitEvent): Promise<Response> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) event.waitUntil(cache.put(request, response.clone()).then(cacheLazy));
  return response;
}

let cachingLazy: Promise<unknown> | undefined;
/** Caches every lazy file, once: a player who opened one block can open the rest offline. */
function cacheLazy(): Promise<unknown> {
  cachingLazy ??= (async () => {
    const cache = await caches.open(CACHE);
    const missing: string[] = [];
    for (const path of lazyFiles(BUILD)) if (!(await cache.match(url(path)))) missing.push(path);
    // Best effort: what fails now is cached when it's next used.
    await Promise.allSettled(missing.map((path) => cache.add(url(path))));
  })();
  return cachingLazy;
}
