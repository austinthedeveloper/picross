import { describe, expect, it } from 'vitest';

/**
 * Nothing in this package imports from an app or another package: both games and every
 * package import it (the story, packages/story, among them), so it can only use its own
 * files. (eslint.config.js says the same with `no-restricted-imports`.)
 */
const sources = import.meta.glob<string>(['./**/*.ts', '!./imports.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Bare imports allowed besides the package's own files. */
const ALLOWED = new Set(['vitest']);

const SPECIFIERS = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
];

function specifiers(code: string): string[] {
  return SPECIFIERS.flatMap((pattern) => [...code.matchAll(pattern)].map((m) => m[1]));
}

// A made-up root, to resolve relative paths against: the package is /shared/, its src /shared/src/.
const ROOT = 'file:///shared/';

describe('the package imports', () => {
  it('finds the sources', () => {
    expect(Object.keys(sources)).toContain('./ui/dom.ts');
    expect(specifiers(sources['./ui/components/muteButton.ts'])).toContain('../dom');
  });

  it('only its own files', () => {
    const outside: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      for (const spec of specifiers(code)) {
        if (spec.startsWith('.')) {
          const resolved = new URL(spec, new URL(file, `${ROOT}src/`)).href;
          if (!resolved.startsWith(ROOT)) outside.push(`${file}: ${spec}`);
        } else if (!ALLOWED.has(spec)) {
          outside.push(`${file}: ${spec}`);
        }
      }
    }
    expect(outside).toEqual([]);
  });
});
