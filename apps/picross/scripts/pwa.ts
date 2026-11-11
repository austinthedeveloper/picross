/**
 * What makes the build installable and playable offline (#160), as plain functions: the web
 * app manifest, and which built files the service worker precaches. The plugin that writes
 * them (`manifest.webmanifest` and `sw.js`) is pwaPlugin.js.
 */
import type { Manifest } from 'vite';
import { GAME_NAME } from '../src/name';

/** A color from the light theme's `:root` block of tokens.css (`--bg`). */
export function tokenColor(css: string, name: string): string {
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const value = new RegExp(`${name}:\\s*([^;]+);`).exec(root)?.[1].trim();
  if (!value) throw new Error(`No ${name} in the :root block of tokens.css`);
  return value;
}

/**
 * The web app manifest, from tokens.css: what Chrome needs to install the game (a name,
 * 192 and 512 px icons, where it starts, standalone), in the page's color.
 */
export function webManifest(tokens: string) {
  const page = tokenColor(tokens, '--bg');
  return {
    id: './',
    name: GAME_NAME,
    short_name: GAME_NAME,
    description:
      'Picture logic puzzles: fill in a grid, or break away a block, to find the picture.',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: page,
    theme_color: page,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

/** A chunk and everything it imports statically (manifest keys). */
function closure(manifest: Manifest, from: string): Set<string> {
  const seen = new Set([from]);
  for (const key of seen) for (const next of manifest[key].imports ?? []) seen.add(next);
  return seen;
}

/**
 * The built code to precache, from Vite's manifest: the entry with its static imports (the
 * 2D game, its pack and the story), and each module the entry loads lazily with its static
 * imports (Cubed's routes, with its pack), unless any of those is `heavy` (has three.js).
 * The rest (three.js, play-block's screens, the block fight) is cached on first use.
 */
export function precacheCode(manifest: Manifest, heavy: (file: string) => boolean): string[] {
  const entries = Object.keys(manifest).filter((key) => manifest[key].isEntry);
  if (entries.length !== 1) {
    throw new Error(`Expected one entry in the manifest, found ${entries.length}`);
  }
  const [entry] = entries;
  const keys = closure(manifest, entry);
  for (const lazy of manifest[entry].dynamicImports ?? []) {
    const opens = closure(manifest, lazy);
    if ([...opens].some((key) => heavy(manifest[key].file))) continue;
    for (const key of opens) keys.add(key);
  }
  const files = [...keys].flatMap((key) => {
    const chunk = manifest[key];
    return [chunk.file, ...(chunk.css ?? []), ...(chunk.assets ?? [])];
  });
  return [...new Set(files)].sort();
}

/** Files in the build that are neither the game nor cached: the workers, Vite's manifest. */
const notCached = (file: string) =>
  file === 'sw.js' || file === '3d/sw.js' || file.startsWith('.vite/');

/**
 * The worker's file lists, from every file in the build (`files`, relative to it): what to
 * precache (every file outside `assets/`, so the page, the art and the icons, and
 * `precacheCode`), and every file in `assets/`.
 */
export function precacheList(
  files: string[],
  manifest: Manifest,
  heavy: (file: string) => boolean,
): { precache: string[]; assets: string[] } {
  const assets = files.filter((file) => file.startsWith('assets/'));
  const others = files.filter((file) => !file.startsWith('assets/') && !notCached(file));
  return { precache: [...others, ...precacheCode(manifest, heavy)], assets };
}
