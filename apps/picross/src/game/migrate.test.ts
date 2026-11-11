import { beforeEach, describe, expect, it } from 'vitest';
import { parseId } from '@picross/shared/puzzles/ids';
import { PUZZLES } from '@picross/block/puzzles/index';
import { dioramaTileIds } from '@picross/block/puzzles/dioramas';
import mainSource from '../main.ts?raw';
import migrateSource from './migrate.ts?raw';
import legacyMergeSource from './legacyMerge.ts?raw';
import mergingSource from './merging.ts?raw';
import daysSource from '@picross/shared/puzzles/days?raw';
import { BACKUP_KEY, KEYS, MARKER_KEY, migrate, SAVE_FORMAT, type KeyValue } from './migrate';
import { DAILY_KEY } from './daily';

/**
 * The first-launch merge (#155) against saves from real play: `fixtures/legacy/` holds every
 * localStorage key the two old games wrote (see each file's `origin`).
 */

const files = import.meta.glob<{ keys: Record<string, unknown> }>('./fixtures/legacy/*.json', {
  eager: true,
  import: 'default',
});
const NAMES = ['flat-only', 'cubed-only', 'both', 'both-mid-run'] as const;
type Name = (typeof NAMES)[number];

/** A fixture's keys as localStorage held them: JSON text, or a plain string. */
function fixture(name: Name): Record<string, string> {
  const { keys } = files[`./fixtures/legacy/${name}.json`];
  return Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
  );
}

const raw = (name: Name) => fixture(name);
const parsed = (name: Name, key: string) => {
  const text = raw(name)[key];
  return text === undefined ? undefined : JSON.parse(text);
};

function seed(keys: Record<string, string>) {
  localStorage.clear();
  for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
}

/** Every key, as text. */
const snapshot = () =>
  Object.fromEntries(
    Object.keys(localStorage)
      .sort()
      .map((k) => [k, localStorage.getItem(k)]),
  );

const read = (key: string) => JSON.parse(localStorage.getItem(key)!);
const NOW = 1_800_000_000_000;

beforeEach(() => localStorage.clear());

describe.each(NAMES)('%s', (name) => {
  const before = raw(name);

  it('merges once, then writes its marker', () => {
    seed(before);
    expect(migrate(localStorage, NOW)).toEqual([1, 2, 3]);
    expect(read(MARKER_KEY)).toEqual({ version: SAVE_FORMAT, mergedAt: NOW });
  });

  it('leaves every old key as it was, and copies the two it rewrites', () => {
    seed(before);
    migrate(localStorage, NOW);
    for (const [key, text] of Object.entries(before)) {
      if (key === 'picross:run' || key === 'picross:settings') continue;
      // Step 3 only adds what's been seen to the badges (#157), which the old game ignores.
      if (key === 'picross:badges') {
        const { seen, ...rest } = read(key);
        expect(seen, key).toBeDefined();
        expect(rest, key).toEqual(JSON.parse(text));
        continue;
      }
      expect(localStorage.getItem(key), key).toBe(text);
    }
    expect(read(BACKUP_KEY)).toEqual({
      'picross:run': before['picross:run'] ?? null,
      'picross:settings': before['picross:settings'] ?? null,
    });
  });

  it('changes nothing when run again', () => {
    seed(before);
    migrate(localStorage, NOW);
    const once = snapshot();
    expect(migrate(localStorage, NOW + 1)).toEqual([]);
    expect(snapshot()).toEqual(once);
  });

  it('comes out the same if cut short before the marker, and run again', () => {
    seed(before);
    migrate(localStorage, NOW);
    const once = snapshot();
    localStorage.removeItem(MARKER_KEY);
    migrate(localStorage, NOW);
    expect(snapshot()).toEqual(once);
  });

  it("keeps each game's free play under its own dimension", () => {
    seed(before);
    migrate(localStorage, NOW);
    const flat = parsed(name, 'picross:v1');
    const cubed = parsed(name, 'picross3d:v1');
    const v2 = read('picross:v2');
    const ids = Object.keys(v2.solved).sort();
    expect(ids).toEqual(
      [
        ...Object.keys(flat?.solved ?? {}).map((id) => `grid:${id}`),
        ...Object.keys(cubed?.solved ?? {}).map((id) => `block:${id}`),
      ].sort(),
    );
    for (const [id, stats] of Object.entries(flat?.solved ?? {})) {
      expect(v2.solved[`grid:${id}`]).toEqual(stats);
    }
    for (const [id, stats] of Object.entries(cubed?.solved ?? {})) {
      expect(v2.solved[`block:${id}`]).toEqual(stats);
    }
    expect(v2.time).toEqual({
      ...(flat ? { grid: flat.totalTime } : {}),
      ...(cubed ? { block: cubed.totalTime } : {}),
    });
    expect(Object.keys(v2.boards).length).toBe(
      Object.keys(flat?.boards ?? {}).length + Object.keys(cubed?.boards ?? {}).length,
    );
  });

  it('means the 3D pack or a diorama tile by every block: id (never a story puzzle)', () => {
    seed(before);
    migrate(localStorage, NOW);
    const v2 = read('picross:v2');
    const known = new Set([...PUZZLES.map((p) => p.id), ...dioramaTileIds()]);
    for (const key of [...Object.keys(v2.solved), ...Object.keys(v2.boards)]) {
      const { dimension, id } = parseId(key);
      if (dimension === 'block') expect(known.has(id), key).toBe(true);
    }
  });

  it('keeps both runs, the scenes seen and the jobs', () => {
    seed(before);
    migrate(localStorage, NOW);
    const flat = parsed(name, 'picross:run');
    const cubed = parsed(name, 'picross3d:run');
    const run = read('picross:run');
    expect(run.current).toEqual(flat?.current ?? null);
    if (cubed) expect(run.block).toEqual({ current: cubed.current });
    else expect(run).not.toHaveProperty('block');
    // One set (sorted when both games had some).
    expect([...run.seenScenes].sort()).toEqual(
      [...new Set([...(flat?.seenScenes ?? []), ...(cubed?.seenScenes ?? [])])].sort(),
    );
    for (const id of new Set([
      ...Object.keys(flat?.jobs ?? {}),
      ...Object.keys(cubed?.jobs ?? {}),
    ])) {
      const [a, b] = [flat?.jobs[id], cubed?.jobs[id]];
      expect(run.jobs[id].plays).toBe((a?.plays ?? 0) + (b?.plays ?? 0));
      expect(run.jobs[id].wins).toBe((a?.wins ?? 0) + (b?.wins ?? 0));
      const wonOn = [...(b?.wins ? ['block'] : []), ...(a?.wins ? ['grid'] : [])];
      if (wonOn.length) expect(run.jobs[id].wonOn).toEqual(wonOn);
      else expect(run.jobs[id]).not.toHaveProperty('wonOn');
    }
  });

  it("makes one daily of both games', a day in either counting (#156)", () => {
    seed(before);
    migrate(localStorage, NOW);
    const flat = parsed(name, 'picross:daily');
    const cubed = parsed(name, 'picross3d:daily');
    const daily = read(DAILY_KEY);
    const cubedDays = Object.keys(cubed?.times ?? {});
    for (const day of cubedDays) expect(daily.days[day]).toBeDefined();
    if (flat) expect(daily.days[flat.lastSolved]).toBeDefined();
    expect(daily.solves).toBe((flat?.solves ?? 0) + cubedDays.length);
    expect(daily.best).toBeGreaterThanOrEqual(Math.max(flat?.best ?? 0, cubed?.best ?? 0));
    expect(daily.streak).toBeGreaterThanOrEqual(Math.max(flat?.streak ?? 0, cubed?.streak ?? 0));
    expect(daily).not.toHaveProperty('board');
  });
});

describe('the fixtures', () => {
  it('cover what the rules are about', () => {
    expect(parsed('both', 'picross:v1').solved.heart).toBeDefined();
    expect(parsed('both', 'picross3d:v1').solved.heart).toBeDefined();
    expect(parsed('both-mid-run', 'picross:run').current.board).toBeDefined();
    expect(parsed('both-mid-run', 'picross3d:run').current.board).toBeDefined();
    // The 2D game had sound on and Cubed off: the 2D game's wins.
    expect(parsed('both', 'picross:settings').muted).toBe(false);
    expect(parsed('both', 'picross3d:settings').muted).toBe(true);
  });

  it('keep heart apart: solved in both games, two entries', () => {
    seed(raw('both'));
    migrate(localStorage, NOW);
    const { solved } = read('picross:v2');
    expect(solved['grid:heart']).toEqual(parsed('both', 'picross:v1').solved.heart);
    expect(solved['block:heart']).toEqual(parsed('both', 'picross3d:v1').solved.heart);
  });

  it("let the 2D game's sound setting win, and bring Cubed's own in", () => {
    seed(raw('both'));
    migrate(localStorage, NOW);
    expect(read('picross:settings')).toMatchObject({
      muted: false,
      mode: 'hearts',
      dimDone: false,
      cubedTutorialDone: true,
      freePlayTab: 'cubed',
    });
  });

  it("take Cubed's settings when the 2D game saved none", () => {
    seed(raw('cubed-only'));
    migrate(localStorage, NOW);
    const cubed = parsed('cubed-only', 'picross3d:settings');
    expect(read('picross:settings')).toEqual({
      mode: cubed.mode,
      listFilter: cubed.listFilter,
      listDifficulty: cubed.listDifficulty,
      muted: cubed.muted,
      highContrast: cubed.highContrast,
      haptics: cubed.haptics,
      dimDone: cubed.dimDone,
      cubedTutorialDone: cubed.tutorialDone,
      freePlayTab: 'cubed',
    });
  });
});

describe('the dailies (#156)', () => {
  it('are one, on the key the daily reads', () => {
    expect(KEYS.daily).toBe(DAILY_KEY);
  });

  it('come out as one day, solved in both games, from the fixtures', () => {
    seed(raw('both'));
    migrate(localStorage, NOW);
    const cubedTime = parsed('both', 'picross3d:daily').times['2026-11-11'];
    // 2026-11-11 is a Cubed day, so it's Cubed's solve (with its time) that the day keeps.
    expect(read(DAILY_KEY)).toEqual({
      days: { '2026-11-11': { dimension: 'block', time: cubedTime } },
      lastSolved: '2026-11-11',
      streak: 1,
      best: 1,
      solves: 2,
    });
  });

  it('merge for a save that had step 1 only, with dailies played since', () => {
    const flat = { lastSolved: '2026-11-12', streak: 2, best: 2, solves: 2 };
    const cubed = { streak: 1, best: 1, last: '2026-11-10', times: { '2026-11-10': 4000 } };
    seed({
      'picross:daily': JSON.stringify(flat),
      'picross3d:daily': JSON.stringify(cubed),
      [MARKER_KEY]: JSON.stringify({ version: 1, mergedAt: 5 }),
    });
    expect(migrate(localStorage, NOW)).toEqual([2, 3]);
    expect(read(MARKER_KEY)).toEqual({ version: 3, mergedAt: 5 });
    expect(read(DAILY_KEY)).toMatchObject({ lastSolved: '2026-11-12', streak: 3, solves: 3 });
    // Both old keys stay as they were, for a rollback.
    expect(read('picross:daily')).toEqual(flat);
    expect(read('picross3d:daily')).toEqual(cubed);
  });

  it('come out the same if cut short before the marker, and run again', () => {
    seed({
      'picross:daily': JSON.stringify({ lastSolved: '2026-11-12', streak: 2, best: 2, solves: 2 }),
      [MARKER_KEY]: JSON.stringify({ version: 1, mergedAt: 5 }),
    });
    migrate(localStorage, NOW);
    const once = snapshot();
    localStorage.setItem(MARKER_KEY, JSON.stringify({ version: 1, mergedAt: 5 }));
    expect(migrate(localStorage, NOW)).toEqual([2, 3]);
    expect(snapshot()).toEqual(once);
  });
});

describe('the badges seen (#157)', () => {
  it('are on the keys the badges read', () => {
    expect(KEYS.badges).toBe('picross:badges');
    expect(KEYS.cubedBadges).toBe('picross3d:badges');
  });

  it("carry Cubed's tiers seen over as block- badges, and count the 2D game's as seen", () => {
    seed(raw('both'));
    migrate(localStorage, NOW);
    // Cubed's shelf last showed No Peeking, Big Blocks and Odd Jobber at bronze (tier 0).
    expect(read('picross:badges').seen).toEqual({
      'invoiced-a-bat': 3,
      'toolbox-shut': 1,
      'block-clean': 1,
      'block-big': 1,
      'block-story': 1,
    });
  });

  it('leave a Cubed-only save its tiers seen, with nothing earned yet', () => {
    seed(raw('cubed-only'));
    migrate(localStorage, NOW);
    expect(read('picross:badges')).toEqual({ earned: {}, seen: { 'block-story': 1 } });
  });

  it('run for a save that had steps 1 and 2, and never lower a level seen', () => {
    seed({
      'picross3d:badges': JSON.stringify({ tiers: { solver: 2, clean: 0, daily: -1 } }),
      'picross:badges': JSON.stringify({
        earned: { 'block-clean': { tier: 'gold' } },
        seen: { 'block-solver': 1, 'block-clean': 3 },
      }),
      [MARKER_KEY]: JSON.stringify({ version: 2, mergedAt: 5 }),
    });
    expect(migrate(localStorage, NOW)).toEqual([3]);
    expect(read('picross:badges').seen).toEqual({ 'block-solver': 3, 'block-clean': 3 });
    // Again, as if cut short before the marker: the same.
    const once = snapshot();
    localStorage.setItem(MARKER_KEY, JSON.stringify({ version: 2, mergedAt: 5 }));
    expect(migrate(localStorage, NOW)).toEqual([3]);
    expect(snapshot()).toEqual(once);
  });
});

describe('the runner', () => {
  it("doesn't merge a save that has the marker", () => {
    const keys = {
      ...raw('both'),
      [MARKER_KEY]: JSON.stringify({ version: SAVE_FORMAT, mergedAt: 5 }),
    };
    seed(keys);
    expect(migrate(localStorage, NOW)).toEqual([]);
    expect(snapshot()).toEqual(Object.fromEntries(Object.entries(keys).sort()));
  });

  it('writes only its marker and an empty copy for a new player', () => {
    migrate(localStorage, NOW);
    expect(snapshot()).toEqual({
      [MARKER_KEY]: JSON.stringify({ version: 3, mergedAt: NOW }),
      [BACKUP_KEY]: JSON.stringify({ 'picross:run': null, 'picross:settings': null }),
    });
  });

  it("leaves a key it can't read alone, and merges the rest", () => {
    seed({ 'picross:v1': '{not json', 'picross3d:v1': JSON.stringify({ totalTime: 4 }) });
    migrate(localStorage, NOW);
    expect(localStorage.getItem('picross:v1')).toBe('{not json');
    expect(read('picross:v2')).toEqual({ solved: {}, boards: {}, time: { block: 4 } });
  });

  it("stops without a marker if it can't keep a copy of what it rewrites", () => {
    seed(raw('both'));
    const store: KeyValue = {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => {
        if (key !== BACKUP_KEY) localStorage.setItem(key, value);
      },
    };
    expect(() => migrate(store, NOW)).toThrow();
    expect(snapshot()).toEqual(Object.fromEntries(Object.entries(raw('both')).sort()));
  });

  it('is the first thing main.ts imports, before any store reads a key', () => {
    const first = mainSource.match(/^import\s+['"][^'"]+['"]|^import\s.+?from\s+['"][^'"]+['"]/m);
    expect(first?.[0]).toBe("import './game/migrate'");
  });

  it('imports no store module, so importing it reads nothing early', () => {
    const imports = (source: string) =>
      [...source.matchAll(/^import (?!type)[\s\S]*?from '(.+?)';$/gm)].map((m) => m[1]);
    expect(imports(migrateSource)).toEqual(['./legacyMerge']);
    expect(imports(legacyMergeSource)).toEqual([
      '@picross/shared/puzzles/days',
      '@picross/shared/puzzles/ids',
      './merging',
    ]);
    // Day keys only: the 2D daily's module would bring in the pack.
    expect(imports(daysSource)).toEqual([]);
    expect(imports(mergingSource)).toEqual([]);
  });
});
