#!/usr/bin/env node
/**
 * Copies the files this game shares with the 2D web game (austinthedeveloper/picross)
 * and records them in shared.lock.json. The web game owns these files: edit them there,
 * then sync. See docs/shared-files.md.
 *
 *   npm run sync:web                     copy from ../picross (or --from DIR)
 *   npm run sync:web -- --check          fail if a shared file was edited here
 *   npm run sync:web -- --check --from DIR   also say which files the web has changed since
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = join(ROOT, 'shared.lock.json');

/** Same path in both repos. Each one only imports other shared files or ones this repo has too. */
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
];

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
  const edited = SHARED.filter(
    (f) => !existsSync(join(ROOT, f)) || sha(join(ROOT, f)) !== lock.files[f],
  );
  const unlisted = Object.keys(lock.files).filter((f) => !SHARED.includes(f));
  let ok = edited.length === 0 && unlisted.length === 0;
  for (const f of edited)
    console.error(`edited here (make the change in the web game, then sync): ${f}`);
  for (const f of unlisted) console.error(`in the lock but not shared any more (sync again): ${f}`);
  if (from) {
    const behind = SHARED.filter(
      (f) => existsSync(join(from, f)) && sha(join(from, f)) !== lock.files[f],
    );
    for (const f of behind) console.log(`changed in the web game since ${lock.commit}: ${f}`);
    if (behind.length === 0) console.log(`Up to date with the web game at ${webCommit(from)}.`);
  }
  if (ok) console.log(`${SHARED.length} shared files match shared.lock.json (web ${lock.commit}).`);
  return ok;
}

function sync(from) {
  const missing = SHARED.filter((f) => !existsSync(join(from, f)));
  if (missing.length) throw new Error(`Not in ${from}: ${missing.join(', ')}`);
  const files = {};
  for (const f of SHARED) {
    mkdirSync(dirname(join(ROOT, f)), { recursive: true });
    copyFileSync(join(from, f), join(ROOT, f));
    files[f] = sha(join(ROOT, f));
  }
  const lock = { source: 'austinthedeveloper/picross', commit: webCommit(from), files };
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
  console.log(`Copied ${SHARED.length} files from the web game at ${lock.commit}.`);
}

const from = option('--from') ?? (flag('--check') ? undefined : join(ROOT, '..', 'picross'));
try {
  if (flag('--check')) process.exit(check(from && resolve(from)) ? 0 : 1);
  sync(resolve(from));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
