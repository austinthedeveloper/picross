#!/usr/bin/env node
/**
 * Copies the files this game shares with the 2D web game (austinthedeveloper/picross)
 * and records them in shared.lock.json. The web game owns these files: edit them there,
 * then sync. See docs/shared-files.md.
 *
 *   npm run sync:web                         copy from the repo root (or --from DIR)
 *   npm run sync:web -- --check              fail if a shared file was edited here
 *   npm run sync:web -- --check --from DIR   also say which files the web has changed since
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = join(ROOT, 'shared.lock.json');

/**
 * Same path in both repos. Each one only imports other shared files or ones this repo has
 * too. A path ending in / is a folder: every file in it (not subfolders) is shared, and
 * files the web game removes from it are removed here.
 */
export const SHARED = [
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/engine/random.ts',
  'src/game/storage.ts',
  'src/ui/dom.ts',
  'src/ui/motion.ts',
  'src/ui/sound.ts',
  'src/ui/haptics.ts',
  'src/ui/haptics.test.ts',
  'src/ui/theme.ts',
  'src/ui/components/homeLink.ts',
  'src/ui/components/muteButton.ts',
  'src/ui/components/gameSwitch.ts',
  // The story (docs/story.md): scenes and their runner, art, and the jobs' data.
  'src/puzzles/backdrops.ts',
  'src/puzzles/backdrops.test.ts',
  'src/puzzles/scenes.ts',
  'src/puzzles/scenes.test.ts',
  'src/puzzles/gadgets.ts',
  'src/game/dialogue.ts',
  'src/game/dialogue.test.ts',
  'src/ui/art.ts',
  'src/ui/art.test.ts',
  'src/ui/components/backdrop.ts',
  'src/ui/components/dialogue.ts',
  'src/styles/art.css',
  'src/styles/dialogue.css',
  'src/styles/run.css',
  'src/styles/fight.css',
  'src/styles/dig.css',
  'src/ui/screens/sceneScreen.ts',
  'src/puzzles/backdrops/',
  'src/puzzles/scenes/',
  'src/puzzles/chapters/',
  'src/puzzles/runs/',
  'src/puzzles/encounters/',
  'src/puzzles/run/',
  'public/art/cast/',
  'public/art/enemies/',
  'public/art/gadgets/',
  'public/art/icons/',
];

const isShared = (f) => SHARED.some((e) => (e.endsWith('/') ? f.startsWith(e) : f === e));

/** Every shared file under `dir`, with folders expanded. */
function expand(dir) {
  return SHARED.flatMap((entry) => {
    if (!entry.endsWith('/')) return existsSync(join(dir, entry)) ? [entry] : [];
    if (!existsSync(join(dir, entry))) return [];
    return readdirSync(join(dir, entry), { withFileTypes: true })
      .filter((d) => d.isFile() && !d.name.startsWith('.'))
      .map((d) => entry + d.name)
      .sort();
  });
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function webCommit(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function check(from) {
  if (!existsSync(LOCK)) throw new Error('No shared.lock.json; run npm run sync:web first.');
  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  const locked = Object.keys(lock.files);
  const here = expand(ROOT);
  const edited = here.filter((f) => sha(join(ROOT, f)) !== lock.files[f]);
  const missing = locked.filter((f) => !existsSync(join(ROOT, f)));
  const unlisted = locked.filter((f) => !isShared(f));
  for (const f of [...edited, ...missing]) {
    console.error(`edited here (make the change in the web game, then sync): ${f}`);
  }
  for (const f of unlisted) console.error(`in the lock but not shared any more (sync again): ${f}`);
  if (from) {
    const theirs = expand(from);
    const behind = [
      ...theirs.filter((f) => sha(join(from, f)) !== lock.files[f]),
      ...locked.filter((f) => !theirs.includes(f)),
    ];
    for (const f of behind) console.log(`changed in the web game since ${lock.commit}: ${f}`);
    if (behind.length === 0) console.log(`Up to date with the web game at ${webCommit(from)}.`);
  }
  const ok = edited.length + missing.length + unlisted.length === 0;
  if (ok) console.log(`${here.length} shared files match shared.lock.json (web ${lock.commit}).`);
  return ok;
}

function sync(from) {
  const missing = SHARED.filter((f) => !existsSync(join(from, f)));
  if (missing.length) throw new Error(`Not in ${from}: ${missing.join(', ')}`);
  const theirs = expand(from);
  // Files the web game removed from a shared folder go here too.
  const old = existsSync(LOCK) ? Object.keys(JSON.parse(readFileSync(LOCK, 'utf8')).files) : [];
  for (const f of old) {
    if (!theirs.includes(f) && existsSync(join(ROOT, f))) rmSync(join(ROOT, f));
  }
  const files = {};
  for (const f of theirs) {
    mkdirSync(dirname(join(ROOT, f)), { recursive: true });
    copyFileSync(join(from, f), join(ROOT, f));
    files[f] = sha(join(ROOT, f));
  }
  const lock = { source: 'austinthedeveloper/picross', commit: webCommit(from), files };
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
  console.log(`Copied ${theirs.length} files from the web game at ${lock.commit}.`);
}

// The 2D game is this repo's root (cubed/ lives inside it).
const from = option('--from') ?? (flag('--check') ? undefined : join(ROOT, '..'));
try {
  if (flag('--check')) process.exit(check(from && resolve(from)) ? 0 : 1);
  sync(resolve(from));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
