import { describe, expect, it } from 'vitest';

/**
 * Nothing here touches the page or an app: it imports only its own files (relative) and
 * the pure modules of @picross/shared and @picross/story, never their `ui/` or styles.
 * (eslint.config.js says the same with `no-restricted-imports`; the rule is copied from
 * packages/shared/src/imports.test.ts.)
 */
const sources = import.meta.glob<string>(['./**/*.ts', '!./imports.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Bare imports allowed besides the package's own files. */
const allowed = (spec: string) =>
  spec === 'vitest' ||
  (/^@picross\/(shared|story)\//.test(spec) &&
    !/^@picross\/(shared|story)\/(ui|styles)\//.test(spec));

const SPECIFIERS = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
];

function specifiers(code: string): string[] {
  return SPECIFIERS.flatMap((pattern) => [...code.matchAll(pattern)].map((m) => m[1]));
}

/**
 * Whether a relative import from `file` (`./engine/solver.ts`, under src/) stays in the
 * package. (Paths by hand: this package builds without the DOM types, so no `URL`.)
 */
function staysInside(file: string, spec: string): boolean {
  const dirs = ['src', ...file.split('/').slice(1, -1)];
  for (const part of spec.split('/')) {
    if (part === '..') {
      if (dirs.pop() === undefined) return false;
    } else if (part !== '.') dirs.push(part);
  }
  return true;
}

describe('the package imports', () => {
  it('resolves relative paths', () => {
    expect(staysInside('./engine/solver.ts', '../puzzles/format')).toBe(true);
    expect(staysInside('./engine/solver.ts', '../../package.json')).toBe(true);
    expect(staysInside('./engine/solver.ts', '../../../apps/picross/src/main')).toBe(false);
  });

  it('finds the sources', () => {
    expect(Object.keys(sources)).toContain('./engine/solver.ts');
    expect(specifiers(sources['./engine/solver.ts'])).toContain('./clues');
    expect(specifiers(sources['./puzzles/index.ts'])).toContain(
      '@picross/story/puzzles/files/runPuzzles',
    );
  });

  it('only its own files and the pure modules of shared and story', () => {
    const outside: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      for (const spec of specifiers(code)) {
        if (spec.startsWith('.')) {
          if (!staysInside(file, spec)) outside.push(`${file}: ${spec}`);
        } else if (!allowed(spec)) {
          outside.push(`${file}: ${spec}`);
        }
      }
    }
    expect(outside).toEqual([]);
  });
});
