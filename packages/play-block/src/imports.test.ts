import { describe, expect, it } from 'vitest';

/**
 * Both games import this package (Cubed for every screen with a block, the 2D game for its
 * block fights), so it never imports from an app: only its own files, the block package,
 * @picross/shared, @picross/story and three.js. (eslint.config.js says the same with
 * `no-restricted-imports`.)
 */
const sources = import.meta.glob<string>(['./**/*.ts', '!./imports.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Bare imports allowed besides the package's own files. */
const allowed = (spec: string) =>
  spec === 'vitest' ||
  spec === 'three' ||
  spec.startsWith('@picross/block/') ||
  spec.startsWith('@picross/shared/') ||
  spec.startsWith('@picross/story/');

const SPECIFIERS = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
  // A worker or asset by URL (the editor's check worker).
  /\bnew URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g,
];

/** Block comments and whole-line comments, which can mention an import in prose. */
const COMMENTS = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm;

function specifiers(code: string): string[] {
  const bare = code.replace(COMMENTS, '');
  return SPECIFIERS.flatMap((pattern) => [...bare.matchAll(pattern)].map((m) => m[1]));
}

// A made-up root, to resolve relative paths against: the package is /play-block/, its src
// /play-block/src/.
const ROOT = 'file:///play-block/';

describe('the package imports', () => {
  it('finds the sources', () => {
    expect(Object.keys(sources)).toContain('./ui/board/blockView.ts');
    expect(specifiers(sources['./ui/board/blockView.ts'])).toContain('three');
    expect(specifiers(sources['./ui/screens/editor/editorScreen.ts'])).toContain(
      './checkWorker.ts',
    );
  });

  it('only its own files, the block package, shared, story and three.js', () => {
    const outside: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      for (const spec of specifiers(code)) {
        if (spec.startsWith('.')) {
          const resolved = new URL(spec, new URL(file, `${ROOT}src/`)).href;
          if (!resolved.startsWith(ROOT)) outside.push(`${file}: ${spec}`);
        } else if (!allowed(spec)) {
          outside.push(`${file}: ${spec}`);
        }
      }
    }
    expect(outside).toEqual([]);
  });
});
