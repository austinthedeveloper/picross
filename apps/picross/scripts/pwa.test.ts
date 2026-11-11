import fs from 'node:fs';
import path from 'node:path';
import type { Manifest } from 'vite';
import { describe, expect, it } from 'vitest';
import { GAME_NAME } from '../src/name';
import { precacheCode, precacheList, tokenColor, webManifest } from './pwa';

const TOKENS = fs.readFileSync(
  path.join(import.meta.dirname, '../../../packages/shared/src/styles/tokens.css'),
  'utf8',
);
const ICONS = path.join(import.meta.dirname, '../public/icons');

/** A build shaped like the real one (dist/.vite/manifest.json). */
const MANIFEST: Manifest = {
  'index.html': {
    file: 'assets/index-AAAAAAAA.js',
    src: 'index.html',
    isEntry: true,
    dynamicImports: ['src/ui/screens/run/blockFight.ts', '_routes-BBBBBBBB.js'],
    css: ['assets/index-AAAAAAAA.css'],
  },
  // Cubed's routes, with its pack (in the prefs chunk) and styles.
  '_routes-BBBBBBBB.js': {
    file: 'assets/routes-BBBBBBBB.js',
    isDynamicEntry: true,
    imports: ['index.html', '_prefs-CCCCCCCC.js'],
    dynamicImports: ['src/cubed/ui/screens/gameScreen.ts'],
    css: ['assets/routes-BBBBBBBB.css'],
  },
  '_prefs-CCCCCCCC.js': { file: 'assets/prefs-CCCCCCCC.js', imports: ['index.html'] },
  'src/cubed/ui/screens/gameScreen.ts': {
    file: 'assets/gameScreen-DDDDDDDD.js',
    isDynamicEntry: true,
    imports: ['_input-EEEEEEEE.js', '_routes-BBBBBBBB.js'],
  },
  // three.js.
  '_input-EEEEEEEE.js': { file: 'assets/input-EEEEEEEE.js', imports: ['index.html'] },
  // The 2D story's block phases: a lazy import of the entry's that brings three.js.
  'src/ui/screens/run/blockFight.ts': {
    file: 'assets/blockFight-FFFFFFFF.js',
    isDynamicEntry: true,
    imports: ['_input-EEEEEEEE.js', 'index.html'],
  },
};
const three = (file: string) => file === 'assets/input-EEEEEEEE.js';

describe('precacheCode', () => {
  it("is the entry and Cubed's routes, with their imports and styles", () => {
    expect(precacheCode(MANIFEST, three)).toEqual([
      'assets/index-AAAAAAAA.css',
      'assets/index-AAAAAAAA.js',
      'assets/prefs-CCCCCCCC.js',
      'assets/routes-BBBBBBBB.css',
      'assets/routes-BBBBBBBB.js',
    ]);
  });

  it('leaves out a lazy module that brings three.js, and everything only it loads', () => {
    const code = precacheCode(MANIFEST, three);
    expect(code).not.toContain('assets/input-EEEEEEEE.js');
    expect(code).not.toContain('assets/blockFight-FFFFFFFF.js');
    expect(code).not.toContain('assets/gameScreen-DDDDDDDD.js');
  });

  it('wants exactly one entry', () => {
    expect(() => precacheCode({}, three)).toThrow(/one entry/);
  });
});

describe('precacheList', () => {
  const files = [
    '.vite/manifest.json',
    '3d/index.html',
    '3d/sw.js',
    'art/cast/bo.png',
    'assets/blockFight-FFFFFFFF.js',
    'assets/checkWorker-GGGGGGGG.js',
    'assets/index-AAAAAAAA.css',
    'assets/index-AAAAAAAA.js',
    'assets/input-EEEEEEEE.js',
    'favicon.svg',
    'icons/icon-192.png',
    'index.html',
    'manifest.webmanifest',
    'sw.js',
  ];

  it('precaches the page, the art and the icons, never the workers or the build manifest', () => {
    const { precache } = precacheList(files, MANIFEST, three);
    expect(precache).toEqual(
      expect.arrayContaining([
        'index.html',
        'manifest.webmanifest',
        'favicon.svg',
        'icons/icon-192.png',
        'art/cast/bo.png',
        '3d/index.html',
        'assets/index-AAAAAAAA.js',
      ]),
    );
    for (const file of ['sw.js', '3d/sw.js', '.vite/manifest.json', 'assets/input-EEEEEEEE.js']) {
      expect(precache).not.toContain(file);
    }
  });

  it('lists every built asset, for keeping what was cached lazily through an update', () => {
    expect(precacheList(files, MANIFEST, three).assets).toEqual(
      files.filter((f) => f.startsWith('assets/')),
    );
  });
});

describe('webManifest', () => {
  const manifest = webManifest(TOKENS);

  it('has what Chrome needs to install it', () => {
    expect(manifest.name).toBe(GAME_NAME);
    expect(manifest.short_name).toBe(GAME_NAME);
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.filter((i) => !('purpose' in i)).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => 'purpose' in i && i.purpose === 'maskable')).toBe(true);
  });

  it('points at icons that exist, at the sizes it says', () => {
    for (const icon of manifest.icons) {
      const png = fs.readFileSync(path.join(ICONS, path.basename(icon.src)));
      // A PNG's width and height are at bytes 16 and 20 (its IHDR chunk).
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it("is the page's color from the theme", () => {
    expect(manifest.background_color).toBe('#f6f3ec');
    expect(manifest.theme_color).toBe(manifest.background_color);
  });
});

describe('tokenColor', () => {
  it("reads the light theme's value, not a later block's", () => {
    const css =
      ':root {\n  --bg: #fff;\n}\n@media (prefers-color-scheme: dark) { :root { --bg: #000; } }';
    expect(tokenColor(css, '--bg')).toBe('#fff');
    expect(() => tokenColor(css, '--nope')).toThrow(/--nope/);
  });
});
