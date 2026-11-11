import { describe, expect, it } from 'vitest';

/**
 * This package is the rules and data of a block, with no screen: both games import it (the
 * 2D game for its block fights), and play-block draws it. So it imports only its own files
 * and the modules of @picross/shared and @picross/story outside `ui/`, and never three.js, which keeps three.js
 * out of any screen that only needs the rules. (eslint.config.js says the same with
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
  (/^@picross\/(shared|story)\//.test(spec) &&
    !/^@picross\/(shared|story)\/(ui|styles)\//.test(spec));

const SPECIFIERS = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
];

/** Block comments and whole-line comments, which can mention an import in prose. */
const COMMENTS = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm;

function specifiers(code: string): string[] {
  const bare = code.replace(COMMENTS, '');
  return SPECIFIERS.flatMap((pattern) => [...bare.matchAll(pattern)].map((m) => m[1]));
}

// A made-up root, to resolve relative paths against: the package is /block/, its src /block/src/.
const ROOT = 'file:///block/';

describe('the package imports', () => {
  it('finds the sources', () => {
    expect(Object.keys(sources)).toContain('./engine/solver.ts');
    expect(specifiers(sources['./engine/solver.ts'])).toContain('./volume');
    expect(specifiers(sources['./game/battle.ts'])).toContain('@picross/shared/engine/random');
  });

  it('only its own files and the shared and story rules', () => {
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

  it('never three.js', () => {
    const three = Object.entries(sources).flatMap(([file, code]) =>
      specifiers(code)
        .filter((spec) => spec === 'three' || spec.startsWith('three/'))
        .map((spec) => `${file}: ${spec}`),
    );
    expect(three).toEqual([]);
    // The check itself sees an import of three.js.
    expect(specifiers("import * as THREE from 'three';")).toEqual(['three']);
  });
});
