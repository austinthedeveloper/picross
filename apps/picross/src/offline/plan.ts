/**
 * The service worker's decisions (worker.ts runs them), kept apart so the tests can check
 * them without a worker: which cache a build uses, how each request is answered, and what a
 * new version keeps from the old one's cache. Paths are relative to the site (the worker's
 * scope): `index.html`, `assets/index-BBGk5lVV.js`, `art/cast/rook.png`.
 */

/** What the build tells its worker (scripts/pwaPlugin.js writes it into sw.js). */
export interface BuildInfo {
  /** A hash of the build's files: each version has a cache of its own. */
  version: string;
  /** Downloaded when the worker installs: the app shell, both packs, the story, the art. */
  precache: string[];
  /** Every file under `assets/` in this build, precached or not. */
  assets: string[];
}

/** This worker's caches, one per version (Cubed's old `picross-cubed` isn't one of them). */
export const CACHE_PREFIX = 'picross-app-';
export const cacheName = (build: BuildInfo) => `${CACHE_PREFIX}${build.version}`;
/** Another version's cache, which the current one deletes when it takes over. */
export const isOldCache = (name: string, current: string) =>
  name.startsWith(CACHE_PREFIX) && name !== current;

/** `url`'s path under the worker's `scope`, or null outside it (another site, say). */
export function sitePath(url: string, scope: string): string | null {
  const at = new URL(url);
  const root = new URL(scope);
  if (at.origin !== root.origin || !at.pathname.startsWith(root.pathname)) return null;
  return decodeURIComponent(at.pathname.slice(root.pathname.length));
}

/**
 * How the worker answers a request:
 * - `page`: a page load. The network first (it's the newest), then `fallback` from the
 *   cache, so the game opens offline. The app routes on the hash, so one page is all of it.
 * - `cached`: a precached file, from the cache.
 * - `lazy`: any other built file (three.js, the screens with a block): the network the first
 *   time, then from the cache (`lazyFiles`).
 * - null: the browser fetches it as if there were no worker.
 */
export type Strategy = { kind: 'page'; fallback: string } | { kind: 'cached' } | { kind: 'lazy' };

/** The pages the worker can open offline, by path, and the cached file each one is. */
const PAGES: Record<string, string> = {
  '': 'index.html',
  'index.html': 'index.html',
  // Cubed's old address, which sends its links on (public/3d/index.html).
  '3d/': '3d/index.html',
  '3d/index.html': '3d/index.html',
};

export function strategy(
  url: string,
  scope: string,
  navigate: boolean,
  precached: ReadonlySet<string>,
): Strategy | null {
  const path = sitePath(url, scope);
  if (path === null) return null;
  if (navigate) {
    const fallback = PAGES[path];
    return fallback ? { kind: 'page', fallback } : null;
  }
  // The workers themselves, this one's and the kill switch at 3d/ (public/3d/sw.js): the
  // browser checks those past any worker, and they're never cached.
  if (path === 'sw.js' || path === '3d/sw.js') return null;
  if (precached.has(path)) return { kind: 'cached' };
  if (path.startsWith('assets/')) return { kind: 'lazy' };
  return null;
}

/** A built file without its content hash: `assets/input-x3wijtv3.js` is `assets/input.js`. */
export const unhashed = (file: string) => file.replace(/-[\w-]{8}(\.\w+)$/, '$1');

/**
 * The built files that aren't precached: three.js and the screens with a block. The first
 * time the player opens one, the worker caches them all (worker.ts), so after one block
 * every block screen opens offline: free play, the tutorial, the daily, a story fight.
 */
export function lazyFiles(build: BuildInfo): string[] {
  const precached = new Set(build.precache);
  return build.assets.filter((file) => !precached.has(file));
}

/**
 * What a new version keeps from the old versions' caches (`oldPaths`). If the player had
 * opened a block (an old cache has one of the lazy files, by name), the new version caches
 * its lazy files too: the ones that are the same are copied across, the ones that changed
 * downloaded. So a block that opened offline before an update still does after it.
 */
export function carryOver(
  oldPaths: string[],
  build: BuildInfo,
): { copy: string[]; fetch: string[] } {
  const lazy = lazyFiles(build);
  const names = new Set(lazy.map(unhashed));
  if (!oldPaths.some((path) => names.has(unhashed(path)))) return { copy: [], fetch: [] };
  const old = new Set(oldPaths);
  return {
    copy: lazy.filter((file) => old.has(file)),
    fetch: lazy.filter((file) => !old.has(file)),
  };
}
