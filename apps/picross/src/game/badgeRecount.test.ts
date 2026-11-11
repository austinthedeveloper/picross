import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUZZLES } from '@picross/block/puzzles/index';
import { dioramaTileIds } from '@picross/block/puzzles/dioramas';
import { chapters as blockChapters, jobs as blockJobs } from '@picross/block/story/data';
import type { Tier } from '../puzzles/badges';
import { badgeLevel } from './legacyMerge';
import { migrate } from './migrate';

/**
 * The one shelf (#157) against saves from real play (`fixtures/legacy/`, see #155): after
 * the merge, every badge either old game showed is there at the same tier or better. Merged
 * job stats and dailies can raise some, never lower one.
 */

const files = import.meta.glob<{ keys: Record<string, unknown> }>('./fixtures/legacy/*.json', {
  eager: true,
  import: 'default',
});
const NAMES = ['flat-only', 'cubed-only', 'both', 'both-mid-run'] as const;

type Keys = Record<string, string>;

const fixture = (name: string): Keys =>
  Object.fromEntries(
    Object.entries(files[`./fixtures/legacy/${name}.json`].keys).map(([k, v]) => [
      k,
      typeof v === 'string' ? v : JSON.stringify(v),
    ]),
  );

const json = <T>(keys: Keys, key: string): T | undefined =>
  keys[key] === undefined ? undefined : (JSON.parse(keys[key]) as T);

interface OldCubedSaves {
  progress?: { solved?: Record<string, { clean?: number }>; playtests?: number };
  run?: { jobs?: Record<string, { wins: number; hitsOnWins?: number }> };
  daily?: { best?: number };
}

/**
 * Cubed's badges as Cubed worked them out before the one shelf (its old `game/badges.ts`),
 * from its own saves: badge id → tier, -1 for none.
 */
function oldCubedTiers(keys: Keys): Record<string, number> {
  const saves: OldCubedSaves = {
    progress: json(keys, 'picross3d:v1'),
    run: json(keys, 'picross3d:run'),
    daily: json(keys, 'picross3d:daily'),
  };
  const solved = Object.keys(saves.progress?.solved ?? {});
  const jobs = saves.run?.jobs ?? {};
  const cleared = new Set(Object.keys(jobs).filter((id) => jobs[id].wins > 0));
  const longest = (id: string) => {
    const p = PUZZLES.find((q) => q.id === id);
    return p ? Math.max(p.dims.x, p.dims.y, p.dims.z) : 0;
  };
  const values: Record<string, [number, number[]]> = {
    solver: [solved.filter((id) => PUZZLES.some((p) => p.id === id)).length, [5, 15, 30]],
    clean: [
      Object.values(saves.progress?.solved ?? {}).filter((s) => (s.clean ?? 0) > 0).length,
      [3, 10, 25],
    ],
    big: [Math.max(0, ...solved.map(longest)), [7, 8, 9]],
    daily: [saves.daily?.best ?? 0, [3, 7, 30]],
    story: [blockChapters.filter((c) => c.jobs.every((j) => cleared.has(j.id))).length, [1, 5, 10]],
    'hits-on': [blockJobs.reduce((n, j) => n + (jobs[j.id]?.hitsOnWins ?? 0), 0), [1, 5, 15]],
    overtime: [
      blockJobs.filter((j) => (j.overtimeOf || j.bossOf) && (jobs[j.id]?.wins ?? 0) > 0).length,
      [1, 3, 8],
    ],
    builder: [saves.progress?.playtests ?? 0, [1, 3, 10]],
    diorama: [dioramaTileIds().filter((id) => solved.includes(id)).length, [2, 5, 10]],
  };
  return Object.fromEntries(
    Object.entries(values).map(([id, [value, steps]]) => [
      id,
      steps.reduce((t, step, i) => (value >= step ? i : t), -1),
    ]),
  );
}

/** The level a Cubed tier is on the one shelf: -1 none is 0, bronze 1, and so on. */
const cubedLevel = (tier: number) => tier + 1;

/** Migrates the keys, then loads the badges as the app would at startup. */
async function recount(keys: Keys) {
  localStorage.clear();
  for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
  migrate(localStorage);
  vi.resetModules();
  const badges = await import('./badges');
  badges.syncBadges();
  return badges;
}

beforeEach(() => localStorage.clear());

describe.each(NAMES)('%s', (name) => {
  const keys = fixture(name);

  it('keeps every badge the 2D game had, at its tier or better', async () => {
    const old = json<{ earned: Record<string, { tier?: Tier }> }>(keys, 'picross:badges');
    const badges = await recount(keys);
    for (const [id, earned] of Object.entries(old?.earned ?? {})) {
      expect(badgeLevel(badges.getEarned(id)), id).toBeGreaterThanOrEqual(badgeLevel(earned));
    }
  });

  it('earns every badge Cubed showed, at its tier or better, under its block- id', async () => {
    const old = oldCubedTiers(keys);
    const badges = await recount(keys);
    for (const [id, tier] of Object.entries(old)) {
      expect(badgeLevel(badges.getEarned(`block-${id}`)), id).toBeGreaterThanOrEqual(
        cubedLevel(tier),
      );
    }
  });

  it("marks nothing new that Cubed's shelf had shown at that tier", async () => {
    const seen = json<{ tiers: Record<string, number> }>(keys, 'picross3d:badges')?.tiers ?? {};
    const badges = await recount(keys);
    for (const [id, tier] of Object.entries(seen)) {
      const level = badgeLevel(badges.getEarned(`block-${id}`));
      expect(badges.isNew(`block-${id}`), id).toBe(level > cubedLevel(tier));
    }
    // The 2D game showed its badges as they were earned.
    const old = json<{ earned: Record<string, object> }>(keys, 'picross:badges');
    for (const id of Object.keys(old?.earned ?? {})) {
      const before = badgeLevel(old!.earned[id]);
      expect(badges.isNew(id), id).toBe(badgeLevel(badges.getEarned(id)) > before);
    }
  });
});

describe('the fixtures, recounted', () => {
  it('show what merging adds: a job won on both boards, and a picture solved on both', async () => {
    const badges = await recount(fixture('both'));
    // First Job was won in each old game, and Heart solved in each.
    expect(badges.getEarned('second-opinion')).toEqual({ tier: 'bronze' });
    expect(badges.getEarned('flat-packed')).toEqual({ tier: 'bronze' });
    expect(badges.isNew('second-opinion')).toBe(true);
    // Cubed's Odd Jobber (one chapter cleared), seen at bronze on Cubed's shelf.
    expect(badges.getEarned('block-story')).toEqual({ tier: 'bronze' });
    expect(badges.isNew('block-story')).toBe(false);
  });

  it('let a Cubed win earn the 2D job badge, now the job stats are one', async () => {
    const badges = await recount(fixture('cubed-only'));
    expect(badges.getEarned('invoiced-a-bat')).toEqual({ tier: 'bronze' });
  });

  it('keep a long-time Cubed player at every tier, with nothing new', async () => {
    // Not from real play: a Cubed save with every badge at gold or near it.
    const solved = Object.fromEntries(
      [...PUZZLES.map((p) => p.id), ...dioramaTileIds()].map((id) => [
        id,
        { solves: 1, bestTime: 5, clean: 1 },
      ]),
    );
    const jobs = Object.fromEntries(
      blockJobs.map((j) => [j.id, { plays: 3, wins: 2, hitsOnWins: 1 }]),
    );
    const keys: Keys = {
      'picross3d:v1': JSON.stringify({ solved, boards: {}, totalTime: 99, playtests: 12 }),
      'picross3d:run': JSON.stringify({ current: null, seenScenes: [], jobs }),
      'picross3d:daily': JSON.stringify({ streak: 0, best: 31, times: {}, last: '2026-01-01' }),
    };
    const old = oldCubedTiers(keys);
    keys['picross3d:badges'] = JSON.stringify({ tiers: old });
    expect(Object.values(old).every((t) => t >= 1)).toBe(true);
    const badges = await recount(keys);
    for (const [id, tier] of Object.entries(old)) {
      expect(badgeLevel(badges.getEarned(`block-${id}`)), id).toBe(cubedLevel(tier));
      expect(badges.isNew(`block-${id}`), id).toBe(false);
    }
  });
});
