#!/usr/bin/env node
/**
 * The first download's budget (#148). Run after `npm run build`. It reads Vite's manifest
 * (dist/.vite/manifest.json) and takes the entry chunk with everything it imports
 * statically: the JS and CSS a player downloads before the home screen. It fails if:
 *
 * - any of it contains three.js. Only the block screens use three.js, and they're lazy
 *   (the 2D game's blockFight, Cubed's play screens); one static import of play-block in
 *   the wrong place would put ~140 kB (gzipped) in front of every player.
 * - its gzipped JS or CSS is more than 10% over the budget in scripts/bundle-budget.json.
 *   Raising a budget is a one-line change there, with the reason in the commit.
 * - Picross Cubed (src/cubed/routes.ts, everything under #/cubed) isn't a lazy chunk of its
 *   own, or three.js is in it or its static imports: Cubed's list opens without three.js too,
 *   which loads only with the screens that draw a block.
 *
 *   node scripts/check-bundle-budget.mjs [dist]
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'dist';
const budgetFile = new URL('./bundle-budget.json', import.meta.url);
const budgets = JSON.parse(readFileSync(budgetFile, 'utf8'));
/** The app, and Cubed's routes in it (one lazy chunk, loaded by src/routes.ts). */
const APP = { key: 'picross', name: 'Picross', dir: dist };
const CUBED = 'src/cubed/routes.ts';
/** How far over its budget an entry may grow before this fails. */
const ALLOWANCE = 0.1;

/**
 * Strings only three.js has: it sets `window.__THREE__` to its version (and warns when it
 * finds two), and its WebGL renderer's warnings start `THREE.WebGLRenderer`. Minifying
 * renames its classes but keeps these.
 */
const THREE_MARKERS = ['__THREE__', 'THREE.WebGLRenderer'];
const hasThree = (code) => THREE_MARKERS.some((marker) => code.includes(marker));

const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
const failures = [];
const fail = (msg) => failures.push(msg);

/** A chunk and everything it imports statically, each with how it got there (for messages). */
function closure(manifest, from) {
  const path = new Map([[from, [from]]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift();
    for (const next of manifest[at].imports ?? []) {
      if (path.has(next)) continue;
      path.set(next, [...path.get(at), next]);
      queue.push(next);
    }
  }
  return path;
}

function check({ key, name, dir }) {
  const manifestPath = join(dir, '.vite', 'manifest.json');
  if (!existsSync(manifestPath)) {
    fail(`${name}: no ${manifestPath}. Run npm run build first (with build.manifest on).`);
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const read = (file) => readFileSync(join(dir, file));
  const gz = (files) => files.reduce((sum, f) => sum + gzipSync(read(f)).length, 0);
  const filesOf = (keys) => {
    const chunks = keys.map((k) => manifest[k]);
    return {
      js: chunks.map((c) => c.file),
      css: [...new Set(chunks.flatMap((c) => c.css ?? []))],
    };
  };
  /** Fails for each chunk in `path` with three.js in it. */
  const noThree = (path, where, fix) => {
    for (const [k, via] of path) {
      if (hasThree(read(manifest[k].file).toString())) {
        fail(
          `${where}, in ${manifest[k].file}` +
            (via.length > 1 ? `, imported statically by ${via.join(' → ')}` : '') +
            `. ${fix}`,
        );
      }
    }
  };

  const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry);
  if (entries.length !== 1) {
    fail(`${name}: expected one entry in ${manifestPath}, found ${entries.length}.`);
    return;
  }
  const [entryKey, entry] = entries[0];
  const html = read('index.html').toString();
  if (!html.includes(entry.file)) {
    fail(`${name}: index.html doesn't load ${entry.file}; is ${manifestPath} stale?`);
    return;
  }

  // three.js in the first download.
  const first = closure(manifest, entryKey);
  noThree(
    first,
    `${name}: three.js is in the first download`,
    'Import the block screens (@picross/play-block) with import() instead.',
  );
  // And somewhere in the build, lazily, so a three.js update that drops the markers
  // can't make the checks here pass by finding nothing.
  const lazy = Object.values(manifest).some(
    (c) => c.file.endsWith('.js') && hasThree(read(c.file).toString()),
  );
  if (!lazy) {
    fail(
      `${name}: can't find three.js anywhere in the build (looked for ${THREE_MARKERS.join(', ')}). ` +
        'If it changed its strings, update THREE_MARKERS in scripts/check-bundle-budget.mjs.',
    );
  }

  // Gzipped sizes, each file on its own as it's served.
  const { js, css } = filesOf([...first.keys()]);
  const sizes = { js: gz(js), css: gz(css) };
  const budget = budgets[key];
  if (!budget) {
    fail(`${name}: no budget for "${key}" in scripts/bundle-budget.json.`);
    return;
  }
  for (const kind of ['js', 'css']) {
    const size = sizes[kind];
    const limit = budget[kind] * (1 + ALLOWANCE);
    const change = ((size / budget[kind] - 1) * 100).toFixed(1);
    const line = `${name} ${kind.toUpperCase()}: ${kB(size)} gzipped (budget ${kB(budget[kind])}, ${change >= 0 ? '+' : ''}${change}%)`;
    console.log(line);
    if (size > limit) {
      fail(
        `${line}: more than ${ALLOWANCE * 100}% over budget. Make it smaller or lazy, ` +
          `or raise "${key}.${kind}" in scripts/bundle-budget.json and say why in the commit.`,
      );
    }
  }
  console.log(`  ${js.length + css.length} files: ${[...js, ...css].join(', ')}`);

  // Picross Cubed: one lazy chunk, without three.js. Its list is a screen like any other, so
  // three.js waits for a screen with a block.
  // Its key is its path, or (when Rollup put modules its screens share in with it) its
  // file: then it's the lazy chunk named routes that loads Cubed's screens.
  const cubedKey = Object.keys(manifest).find(
    (k) =>
      k === CUBED ||
      (manifest[k].isDynamicEntry &&
        manifest[k].name === 'routes' &&
        (manifest[k].dynamicImports ?? []).some((d) => d.startsWith('src/cubed/'))),
  );
  const cubed = cubedKey && manifest[cubedKey];
  if (!cubed?.isDynamicEntry) {
    fail(
      `Picross Cubed: ${CUBED} isn't a lazy chunk of its own. src/routes.ts loads it with ` +
        "import('./cubed/routes'); nothing else imports it statically.",
    );
    return;
  }
  if (first.has(cubedKey)) fail(`Picross Cubed: ${CUBED} is in the first download.`);
  const opening = closure(manifest, cubedKey);
  noThree(
    opening,
    "Picross Cubed: three.js loads with Cubed's routes",
    'Import its screens with a block with import() (as cubed/routes.ts does).',
  );
  // What opening Cubed adds to the first download.
  const added = filesOf([...opening.keys()].filter((k) => !first.has(k)));
  console.log(
    `Picross Cubed (${CUBED}, lazy): ${kB(gz(added.js))} JS, ${kB(gz(added.css))} CSS gzipped, ` +
      `in ${added.js.length + added.css.length} files: ${[...added.js, ...added.css].join(', ')}`,
  );
}

check(APP);
if (failures.length) {
  console.error(`\nBundle budget failed:\n${failures.map((f) => `- ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(
  "The first download is within budget, and neither it nor Cubed's routes have three.js.",
);
