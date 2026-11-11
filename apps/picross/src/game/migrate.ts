import {
  mergeBadgesSeen,
  mergeDailies,
  mergeLegacy,
  type CubedSaves,
  type FlatSaves,
  type LegacyCubedBadges,
  type LegacyCubedDaily,
  type LegacyFlatDaily,
} from './legacyMerge';
import type { BadgeSave } from './badges';

/**
 * Save migrations, run once at startup before anything reads a save. The store modules read
 * localStorage when they're first imported, so `main.ts` imports this module first, and this
 * module imports no store module (only pure merges, and their types). Its keys are written
 * out here for the same reason.
 *
 * Each step has a version and is safe to run again: it reads only keys nothing else writes
 * (or a copy taken before it first wrote), so a step cut short just runs again next time.
 * The marker, `picross:save`, is written after each step and says which have run.
 *
 * Nothing here deletes a key. The old ones stay for at least a release, for a rollback.
 */

export const MARKER_KEY = 'picross:save';
/** Copies of the keys step 1 rewrites, as they were before it first ran. */
export const BACKUP_KEY = 'picross:premerge';

/** Every key a step reads or writes. */
export const KEYS = {
  flatProgress: 'picross:v1',
  flatRun: 'picross:run',
  flatSettings: 'picross:settings',
  flatGame: 'picross:game',
  cubedProgress: 'picross3d:v1',
  cubedRun: 'picross3d:run',
  cubedSettings: 'picross3d:settings',
  /** The merged free play. Runs and settings stay on the 2D game's keys. */
  progress: 'picross:v2',
  /** Step 2's: the two dailies, and the one they become (`game/daily.ts`). */
  flatDaily: 'picross:daily',
  cubedDaily: 'picross3d:daily',
  daily: 'picross:daily2',
  /** Step 3's: Cubed's badge tiers seen, and the one badge save (`game/badges.ts`). */
  cubedBadges: 'picross3d:badges',
  badges: 'picross:badges',
} as const;

/** The marker: the last step run, and when the first one ran. */
export interface SaveMarker {
  version: number;
  mergedAt: number;
}

/** The part of localStorage a migration uses, so tests can hand it a map. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface Step {
  version: number;
  run(store: KeyValue): void;
}

/** A key's JSON object, or undefined when it's missing or unreadable. */
function readJson<T>(store: KeyValue, key: string): T | undefined {
  return parse<T>(store.getItem(key));
}

function parse<T>(raw: string | null | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined;
  } catch {
    return undefined;
  }
}

type Backup = Record<string, string | null>;

/**
 * Step 1 (#155): the two old games' saves become one. Free play moves to `picross:v2` with
 * qualified ids; Cubed's run, scenes, tips and jobs join the 2D game's in `picross:run`;
 * Cubed's settings join `picross:settings`. `picross:v1` and every `picross3d:` key are only
 * read, and the two keys rewritten keep their old text in `picross:premerge`.
 */
function mergeTheGames(store: KeyValue): void {
  let backup = readJson<Backup>(store, BACKUP_KEY);
  if (!backup) {
    backup = {
      [KEYS.flatRun]: store.getItem(KEYS.flatRun),
      [KEYS.flatSettings]: store.getItem(KEYS.flatSettings),
    };
    const text = JSON.stringify(backup);
    store.setItem(BACKUP_KEY, text);
    // Without the copy, running again would merge Cubed into a run it's already in.
    if (store.getItem(BACKUP_KEY) !== text) throw new Error('Could not back up the save');
  }
  const flat: FlatSaves = {
    progress: readJson(store, KEYS.flatProgress),
    run: parse(backup[KEYS.flatRun]),
    settings: parse(backup[KEYS.flatSettings]),
    game: store.getItem(KEYS.flatGame),
  };
  const cubed: CubedSaves = {
    progress: readJson(store, KEYS.cubedProgress),
    run: readJson(store, KEYS.cubedRun),
    settings: readJson(store, KEYS.cubedSettings),
  };
  const merged = mergeLegacy(flat, cubed);
  if (merged.progress) store.setItem(KEYS.progress, JSON.stringify(merged.progress));
  if (merged.run) store.setItem(KEYS.flatRun, JSON.stringify(merged.run));
  if (merged.settings) store.setItem(KEYS.flatSettings, JSON.stringify(merged.settings));
}

/**
 * Step 2 (#156): one daily and one streak. `picross:daily` and `picross3d:daily` merge into
 * `picross:daily2` (`legacyMerge.ts`'s `mergeDailies`), and both stay as they were. A save
 * merged by step 1 alone has played both dailies since on their old keys, so this reads them
 * whenever it runs.
 */
function mergeTheDailies(store: KeyValue): void {
  const merged = mergeDailies(
    readJson<LegacyFlatDaily>(store, KEYS.flatDaily),
    readJson<LegacyCubedDaily>(store, KEYS.cubedDaily),
  );
  if (merged) store.setItem(KEYS.daily, JSON.stringify(merged));
}

/**
 * Step 3 (#157): one badge shelf. Cubed's badges are earned into `picross:badges` like the
 * 2D game's (as `block-<id>`, by `syncBadges` at startup), so all this carries over is what
 * each player has already seen: the tiers in `picross3d:badges`, which stays as it was, and
 * the 2D game's badges, which it showed as they were earned. Only `seen` changes, and only
 * upward, so running it again changes nothing.
 */
function carryBadgesSeen(store: KeyValue): void {
  const merged = mergeBadgesSeen(
    readJson<BadgeSave>(store, KEYS.badges),
    readJson<LegacyCubedBadges>(store, KEYS.cubedBadges),
  );
  if (merged) store.setItem(KEYS.badges, JSON.stringify(merged));
}

const STEPS: Step[] = [
  { version: 1, run: mergeTheGames },
  { version: 2, run: mergeTheDailies },
  { version: 3, run: carryBadgesSeen },
];

/** The version a save is at once every step has run. */
export const SAVE_FORMAT = STEPS[STEPS.length - 1].version;

/** Runs the steps a save hasn't had yet. Returns the versions run. */
export function migrate(store: KeyValue, now = Date.now()): number[] {
  const marker = readJson<Partial<SaveMarker>>(store, MARKER_KEY);
  const from = typeof marker?.version === 'number' ? marker.version : 0;
  const mergedAt = typeof marker?.mergedAt === 'number' ? marker.mergedAt : now;
  const ran: number[] = [];
  for (const step of STEPS) {
    if (step.version <= from) continue;
    step.run(store);
    const next: SaveMarker = { version: step.version, mergedAt };
    store.setItem(MARKER_KEY, JSON.stringify(next));
    ran.push(step.version);
  }
  return ran;
}

try {
  migrate(localStorage);
} catch {
  // Storage blocked or full: the old keys are untouched, and it tries again next launch.
}
