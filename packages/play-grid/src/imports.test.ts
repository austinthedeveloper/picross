import { describe, expect, it } from 'vitest';

/**
 * Nothing here imports from an app: it uses its own files (relative), @picross/grid and
 * @picross/shared. Whatever the screen needs from the app (saves, the next puzzle, a
 * fight) comes in through the `PlaySession` it's given. (eslint.config.js says the same
 * with `no-restricted-imports`; the rule is copied from packages/shared/src/imports.test.ts.)
 */
const sources = import.meta.glob<string>(['./**/*.ts', '!./imports.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Bare imports allowed besides the package's own files. */
const allowed = (spec: string) =>
  spec === 'vitest' || spec.startsWith('@picross/grid/') || spec.startsWith('@picross/shared/');

const SPECIFIERS = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
];

function specifiers(code: string): string[] {
  return SPECIFIERS.flatMap((pattern) => [...code.matchAll(pattern)].map((m) => m[1]));
}

// A made-up root, to resolve relative paths against: the package is /play-grid/, its src /play-grid/src/.
const ROOT = 'file:///play-grid/';

describe('the package imports', () => {
  it('finds the sources', () => {
    expect(Object.keys(sources)).toContain('./ui/screens/gameScreen.ts');
    expect(specifiers(sources['./ui/screens/gameScreen.ts'])).toContain('../board/boardView');
    expect(specifiers(sources['./ui/screens/gameScreen.ts'])).toContain('@picross/grid/game/game');
  });

  it('only its own files, grid and shared', () => {
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
