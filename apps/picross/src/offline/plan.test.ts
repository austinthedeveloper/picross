import { describe, expect, it } from 'vitest';
import {
  cacheName,
  carryOver,
  isOldCache,
  lazyFiles,
  sitePath,
  strategy,
  unhashed,
  type BuildInfo,
} from './plan';

const ROOT = 'https://example.com/';
const PAGES = 'https://user.github.io/picross/';

describe('sitePath', () => {
  it('is the path under the scope, at a root or under a project path', () => {
    expect(sitePath('https://example.com/assets/a.js', ROOT)).toBe('assets/a.js');
    expect(sitePath('https://example.com/?moved=#/cubed', ROOT)).toBe('');
    expect(sitePath('https://user.github.io/picross/art/cast/bo.png', PAGES)).toBe(
      'art/cast/bo.png',
    );
  });

  it('is null outside the scope', () => {
    expect(sitePath('https://fonts.gstatic.com/x.woff2', ROOT)).toBeNull();
    expect(sitePath('https://user.github.io/other/index.html', PAGES)).toBeNull();
  });
});

describe('strategy', () => {
  const precached = new Set(['index.html', 'assets/index-AAAAAAAA.js', 'art/cast/bo.png']);
  const at = (path: string, navigate = false) => strategy(ROOT + path, ROOT, navigate, precached);

  it('opens the app and the old /3d/ page from the network, then the cache', () => {
    expect(at('', true)).toEqual({ kind: 'page', fallback: 'index.html' });
    expect(at('index.html', true)).toEqual({ kind: 'page', fallback: 'index.html' });
    expect(at('3d/', true)).toEqual({ kind: 'page', fallback: '3d/index.html' });
    expect(at('?moved=', true)).toEqual({ kind: 'page', fallback: 'index.html' });
  });

  it("leaves pages it can't open offline to the browser", () => {
    expect(at('some/other/page', true)).toBeNull();
  });

  it('serves precached files from the cache, and caches other built files on first use', () => {
    expect(at('assets/index-AAAAAAAA.js')).toEqual({ kind: 'cached' });
    expect(at('art/cast/bo.png')).toEqual({ kind: 'cached' });
    expect(at('assets/input-BBBBBBBB.js')).toEqual({ kind: 'lazy' });
  });

  it('never caches the workers, or anything off the site', () => {
    expect(at('sw.js')).toBeNull();
    expect(at('3d/sw.js')).toBeNull();
    expect(at('.vite/manifest.json')).toBeNull();
    expect(strategy('https://fonts.gstatic.com/a.woff2', ROOT, false, precached)).toBeNull();
  });
});

describe('caches', () => {
  it('has one per version, and deletes only its own old ones', () => {
    const current = cacheName({ version: 'abc', precache: [], assets: [] });
    expect(current).toBe('picross-app-abc');
    expect(isOldCache('picross-app-old', current)).toBe(true);
    expect(isOldCache(current, current)).toBe(false);
    // Cubed's old cache is the kill switch's to delete (public/3d/sw.js).
    expect(isOldCache('picross-cubed', current)).toBe(false);
  });
});

describe('unhashed', () => {
  it("drops Vite's 8-character hash, which can have dashes in it", () => {
    expect(unhashed('assets/input-x3wijtv3.js')).toBe('assets/input.js');
    expect(unhashed('assets/routes-Dd3cb4i-.js')).toBe('assets/routes.js');
    expect(unhashed('assets/fight-Bpc-j84l.js')).toBe('assets/fight.js');
    expect(unhashed('assets/routes-D3hZxpzV.css')).toBe('assets/routes.css');
  });
});

describe('lazyFiles', () => {
  it("is every built file that isn't precached", () => {
    expect(
      lazyFiles({
        version: 'v',
        precache: ['index.html', 'assets/a-AAAAAAAA.js'],
        assets: ['assets/a-AAAAAAAA.js', 'assets/b-BBBBBBBB.js'],
      }),
    ).toEqual(['assets/b-BBBBBBBB.js']);
  });
});

describe('carryOver', () => {
  const build: BuildInfo = {
    version: 'new',
    precache: ['index.html', 'assets/index-NEWNEW00.js'],
    assets: [
      'assets/index-NEWNEW00.js',
      'assets/input-SAMESAME.js',
      'assets/play-NEWNEW00.js',
      'assets/editor-NEWNEW00.js',
    ],
  };

  it('once the player has opened a block: copies the lazy files that are the same, downloads the rest', () => {
    const old = [
      'index.html',
      'assets/index-OLDOLD00.js',
      'assets/input-SAMESAME.js',
      'assets/play-OLDOLD00.js',
    ];
    expect(carryOver(old, build)).toEqual({
      copy: ['assets/input-SAMESAME.js'],
      fetch: ['assets/play-NEWNEW00.js', 'assets/editor-NEWNEW00.js'],
    });
  });

  it('leaves them all for later if the player never opened a block', () => {
    expect(carryOver(['index.html', 'assets/index-OLDOLD00.js'], build)).toEqual({
      copy: [],
      fetch: [],
    });
    expect(carryOver([], build)).toEqual({ copy: [], fetch: [] });
  });
});
