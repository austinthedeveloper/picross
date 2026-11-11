import { describe, expect, it } from 'vitest';

/**
 * Both games import the story, so it never imports from either, nor from the board
 * packages (grid, play-grid, block, play-block): they import it. It uses its own files and
 * @picross/shared. Its data and loaders (everything outside `ui/`) are pure: they use only
 * shared's pure modules, never `@picross/shared/ui`, its styles or this package's `ui/`.
 * The scene player in `ui/` draws with shared's `ui/`. Tests may also use `@picross/block`
 * (a dev dependency, for the gate in boards.test.ts). (eslint.config.js says the same with
 * `no-restricted-imports`.)
 */
const sources = import.meta.glob<string>(['./**/*.ts', '!./imports.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** The one path out of the package: the art test reads shared's art folder. */
const SHARED_ART = { file: './ui/art.test.ts', spec: '../../../shared/public/art/**/*.png' };

const isUi = (file: string) => file.startsWith('./ui/');
const isTest = (file: string) => file.endsWith('.test.ts');

/** Bare imports allowed besides the package's own files. */
function allowed(file: string, spec: string): boolean {
  if (spec === 'vitest') return true;
  if (spec.startsWith('@picross/shared/')) {
    return isUi(file) || !/^@picross\/shared\/(ui|styles)\//.test(spec);
  }
  return isTest(file) && spec.startsWith('@picross/block/');
}

const SPECIFIERS = [
  /\b(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\.meta\.glob(?:<[^>]*>)?\(\s*['"]([^'"]+)['"]/g,
];

// Comments aren't stripped (as they are in packages/block's): a glob like `art/**/*.png`
// would look like one.
function specifiers(code: string): string[] {
  return SPECIFIERS.flatMap((pattern) => [...code.matchAll(pattern)].map((m) => m[1]));
}

// A made-up root, to resolve relative paths against: the package is /story/, its src /story/src/.
const ROOT = 'file:///story/';

describe('the package imports', () => {
  it('finds the sources', () => {
    expect(Object.keys(sources)).toContain('./puzzles/scenes.ts');
    expect(specifiers(sources['./puzzles/scenes.ts'])).toContain('./backdrops');
    expect(specifiers(sources['./ui/components/dialogue.ts'])).toContain('@picross/shared/ui/dom');
    expect(specifiers(sources[SHARED_ART.file])).toContain(SHARED_ART.spec);
  });

  it('only its own files and shared (its pure modules, outside ui/)', () => {
    const outside: string[] = [];
    for (const [file, code] of Object.entries(sources)) {
      for (const spec of specifiers(code)) {
        if (spec.startsWith('.')) {
          const resolved = new URL(spec, new URL(file, `${ROOT}src/`)).href;
          const ok =
            resolved.startsWith(ROOT) &&
            (isUi(file) || !resolved.startsWith(`${ROOT}src/ui/`) || isTest(file));
          if (!ok && !(file === SHARED_ART.file && spec === SHARED_ART.spec)) {
            outside.push(`${file}: ${spec}`);
          }
        } else if (!allowed(file, spec)) {
          outside.push(`${file}: ${spec}`);
        }
      }
    }
    expect(outside).toEqual([]);
  });

  it('keeps the board packages for tests', () => {
    expect(allowed('./puzzles/runs.ts', '@picross/block/story/data')).toBe(false);
    expect(allowed('./boards.test.ts', '@picross/block/story/data')).toBe(true);
    expect(allowed('./boards.test.ts', '@picross/grid/puzzles/index')).toBe(false);
    expect(allowed('./puzzles/scenes.ts', '@picross/shared/ui/dom')).toBe(false);
    expect(allowed('./ui/screens/sceneScreen.ts', '@picross/shared/ui/dom')).toBe(true);
  });
});
