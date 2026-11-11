import { beforeEach, describe, expect, it, vi } from 'vitest';
import { puzzles } from '@picross/grid/puzzles/index';
import { murals } from '@picross/grid/puzzles/murals';
import { blockCatalog } from '@picross/block/puzzles/catalog';
import { chapters as blockChapters, jobs as blockJobs } from '@picross/block/story/data';
import { badges, getBadge, type Count } from '../puzzles/badges';
import { chapters } from '../puzzles/chapters';
import { bossFights, overtimeRuns, runs } from '../puzzles/runs';
import { ENDLESS_ID } from '../puzzles/endless';
import { countAward, countAwards, countOf, nextStep, type Facts } from './badges';
import type { JobStats } from './runSave';

/** Both boards' saves, for the counts (#157). */
function facts({
  jobs = {},
  dailyBest = 0,
  grid = [],
  block = [],
  cleanBlocks = 0,
  playtests = 0,
}: {
  jobs?: Record<string, JobStats>;
  dailyBest?: number;
  grid?: string[];
  block?: string[];
  cleanBlocks?: number;
  playtests?: number;
} = {}): Facts {
  return {
    job: (id) => jobs[id],
    jobIds: Object.keys(jobs),
    dailyBest,
    solved: { grid, block },
    cleanBlocks,
    playtests,
  };
}

const count = (c: Count, f: Facts) => countOf(c, f);
const blockIds = Object.keys(blockCatalog.puzzles);
const sideOf = (id: string) => blockCatalog.puzzles[id];
const win = (wonOn?: JobStats['wonOn']): JobStats => ({
  plays: 1,
  wins: 1,
  ...(wonOn ? { wonOn } : {}),
});
/** Ids in both packs: the same picture, flat and as a block. */
const shared = puzzles.map((p) => p.id).filter((id) => id in blockCatalog.puzzles);

describe('the counts', () => {
  it('count only Flat pack puzzles as Flat free play, not mural tiles', () => {
    const tile = murals[0].tiles[0].id;
    const f = facts({ grid: [puzzles[0].id, puzzles[1].id, tile, 'not-a-puzzle'] });
    expect(count('flat-solved', f)).toBe(2);
  });

  it('count the 20×20s', () => {
    const big = puzzles.filter((p) => Math.max(p.width, p.height) >= 20).map((p) => p.id);
    const small = puzzles.filter((p) => Math.max(p.width, p.height) < 20).map((p) => p.id);
    expect(count('flat-big', facts({ grid: [...big.slice(0, 3), ...small.slice(0, 5)] }))).toBe(3);
  });

  it('count a mural once every tile is solved', () => {
    const [whole, half] = murals;
    const grid = [...whole.tiles.map((t) => t.id), ...half.tiles.slice(1).map((t) => t.id)];
    expect(count('murals', facts({ grid }))).toBe(1);
  });

  it("count Cubed's pack apart from its diorama pieces, and its biggest block", () => {
    const pieces = blockCatalog.dioramaTiles.slice(0, 3);
    const two = [blockIds[0], blockIds[1]];
    const f = facts({ block: [...two, ...pieces, 'not-a-block'] });
    expect(count('cubed-solved', f)).toBe(2);
    expect(count('diorama-pieces', f)).toBe(3);
    expect(count('cubed-biggest', f)).toBe(Math.max(...two.map(sideOf)));
    expect(count('cubed-biggest', facts({ block: pieces }))).toBe(0);
  });

  it('count the story on either board: chapters, Hits-on wins, Overtime and boss fights', () => {
    const first = chapters[0];
    const jobs: Record<string, JobStats> = Object.fromEntries(
      first.jobs.map((j) => [j.id, { plays: 2, wins: 1, hitsOnWins: 1 }]),
    );
    jobs[overtimeRuns[0].id] = { plays: 1, wins: 1, hitsOnWins: 2 };
    jobs[bossFights[0].id] = { plays: 3, wins: 0 };
    // A loss isn't a clear.
    jobs[chapters[1].jobs[0].id] = { plays: 4, wins: 0 };
    const f = facts({ jobs });
    expect(count('chapters', f)).toBe(1);
    expect(count('hits-on-wins', f)).toBe(first.jobs.length + 2);
    expect(count('overtime-wins', f)).toBe(1);
  });

  it('take the daily streak, the play-tests and the clean blocks as saved', () => {
    const f = facts({ dailyBest: 9, playtests: 4, cleanBlocks: 6 });
    expect([count('best-streak', f), count('playtests', f), count('cubed-clean', f)]).toEqual([
      9, 4, 6,
    ]);
  });
});

describe('Both boards (#157)', () => {
  const flat50 = puzzles.slice(0, 50).map((p) => p.id);

  it('Fifty-Fifty: 50 free-play puzzles on each board, no fewer on either', () => {
    const fifty = getBadge('fifty-fifty')!;
    const some = facts({ grid: flat50, block: blockIds.slice(0, 50) });
    expect(count('both-solved', some)).toBe(50);
    expect(countAward(fifty, 50)).toEqual({ id: 'fifty-fifty' });
    const short = facts({ grid: puzzles.map((p) => p.id), block: blockIds.slice(0, 49) });
    expect(count('both-solved', short)).toBe(49);
    expect(countAwards(short).map((a) => a.id)).not.toContain('fifty-fifty');
    // Diorama pieces and mural tiles aren't free-play puzzles.
    const tiles = facts({
      grid: [...flat50, ...murals.flatMap((m) => m.tiles.map((t) => t.id))],
      block: [...blockIds.slice(0, 40), ...blockCatalog.dioramaTiles],
    });
    expect(count('both-solved', tiles)).toBe(40);
  });

  it('Second Opinion: the same job won on both boards', () => {
    const f = facts({
      jobs: {
        'first-job': win(['block', 'grid']),
        'night-shift': win(['grid']),
        'deep-end': win(['block']),
        // Wins from before the merge without a board don't count for either.
        glasshouse: win(),
      },
    });
    expect(count('jobs-on-both', f)).toBe(1);
    expect(countAwards(f)).toContainEqual({ id: 'second-opinion', tier: 'bronze' });
    const none = facts({ jobs: { 'night-shift': win(['grid']), 'deep-end': win(['block']) } });
    expect(countAwards(none).map((a) => a.id)).not.toContain('second-opinion');
  });

  it("Second Opinion doesn't count Endless, which nobody wins", () => {
    const f = facts({ jobs: { [ENDLESS_ID]: { plays: 3, wins: 1, wonOn: ['block', 'grid'] } } });
    expect(count('jobs-on-both', f)).toBe(0);
  });

  it('Flat-Packed: the same picture solved flat and as a block', () => {
    expect(shared.length).toBeGreaterThanOrEqual(25);
    const [a, b, c] = shared;
    const f = facts({ grid: [a, b, 'arrow'], block: [a, c, blockCatalog.dioramaTiles[0]] });
    expect(count('pictures-on-both', f)).toBe(1);
    expect(countAwards(f)).toContainEqual({ id: 'flat-packed', tier: 'bronze' });
    const all = facts({ grid: shared, block: shared });
    expect(countAwards(all)).toContainEqual({ id: 'flat-packed', tier: 'gold' });
  });

  it('has all three on its shelf, each reachable with the packs as they are', () => {
    const both = badges.filter((b) => b.section === 'both').map((b) => b.id);
    expect(both).toEqual(['fifty-fifty', 'second-opinion', 'flat-packed']);
    const everything = facts({
      grid: puzzles.map((p) => p.id),
      block: blockIds,
      jobs: Object.fromEntries(
        [...runs, ...overtimeRuns, ...bossFights].map((j) => [j.id, win(['block', 'grid'])]),
      ),
    });
    const awards = countAwards(everything);
    expect(awards).toContainEqual({ id: 'fifty-fifty' });
    expect(awards).toContainEqual({ id: 'second-opinion', tier: 'gold' });
    expect(awards).toContainEqual({ id: 'flat-packed', tier: 'gold' });
  });
});

describe('count badges', () => {
  const solver = getBadge('block-solver')!;

  it('tier by their steps', () => {
    expect([0, 4, 5, 14, 15, 29, 30, 99].map((n) => countAward(solver, n)?.tier ?? null)).toEqual([
      null,
      null,
      'bronze',
      'bronze',
      'silver',
      'silver',
      'gold',
      'gold',
    ]);
  });

  it('say what the next tier needs', () => {
    expect(nextStep(solver, 3)).toBe('Bronze at 5 (3 so far)');
    expect(nextStep(solver, 20)).toBe('Gold at 30 (20 so far)');
    expect(nextStep(solver, 40)).toBe('All tiers earned');
    const fifty = getBadge('fifty-fifty')!;
    expect(nextStep(fifty, 12)).toBe('12 of 50 so far');
    expect(nextStep(fifty, 50)).toBe('Done');
  });

  it('earn nothing on a fresh save', () => {
    expect(countAwards(facts())).toEqual([]);
  });

  it("keep Cubed's nine, under block- ids", () => {
    const ported = badges.filter((b) => b.id.startsWith('block-')).map((b) => b.id);
    expect(ported.sort()).toEqual(
      ['solver', 'clean', 'big', 'daily', 'story', 'hits-on', 'overtime', 'builder', 'diorama']
        .map((id) => `block-${id}`)
        .sort(),
    );
  });

  it('give each shelf something, and every count a badge', () => {
    for (const section of [
      'story',
      'flat',
      'cubed',
      'daily',
      'endless',
      'mastery',
      'losses',
      'both',
    ]) {
      expect(
        badges.some((b) => b.section === section),
        section,
      ).toBe(true);
    }
  });

  it('have names no other badge has', () => {
    const names = badges.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("the 2D game's story, for Cubed's story badges", () => {
  // Odd Jobber, Hits On and Overtime counted Cubed's jobs; the one shelf counts the 2D
  // game's. They're the same story, so a recount can't come out lower.
  it('has the same chapters and jobs as Cubed plays', () => {
    const ids = (cs: { id: string; jobs: { id: string }[] }[]) =>
      cs.map((c) => [c.id, c.jobs.map((j) => j.id)]);
    expect(ids(chapters)).toEqual(ids(blockChapters));
    const all = [...runs, ...overtimeRuns, ...bossFights].map((j) => j.id).sort();
    expect(all).toEqual(blockJobs.map((j) => j.id).sort());
  });
});

describe('earning count badges', () => {
  async function load() {
    vi.resetModules();
    return import('./badges');
  }
  const solved = (ids: string[], extra: Record<string, unknown> = {}) =>
    localStorage.setItem(
      'picross:v2',
      JSON.stringify({
        solved: Object.fromEntries(ids.map((id) => [id, { solves: 1, bestTime: 9, ...extra }])),
        boards: {},
        time: {},
      }),
    );

  beforeEach(() => localStorage.clear());

  it("awards Cubed's badges from the one save at startup, without dates", async () => {
    solved(blockIds.slice(0, 16).map((id) => `block:${id}`));
    const save = await load();
    save.syncBadges();
    expect(save.getEarned('block-solver')).toEqual({ tier: 'silver' });
    expect(save.getEarned('flat-solver')).toBeUndefined();
  });

  it('never lowers a tier, whatever the saves say now', async () => {
    localStorage.setItem(
      'picross:badges',
      JSON.stringify({ earned: { 'block-solver': { tier: 'gold', at: 7 }, 'fifty-fifty': {} } }),
    );
    solved(blockIds.slice(0, 5).map((id) => `block:${id}`));
    const save = await load();
    save.syncBadges();
    expect(save.getEarned('block-solver')).toEqual({ tier: 'gold', at: 7 });
    expect(save.getEarned('fifty-fifty')).toEqual({});
    expect(save.earn([{ id: 'block-solver', tier: 'bronze' }])).toEqual([]);
    expect(save.earn([{ id: 'block-solver' }])).toEqual([]);
    expect(save.getEarned('block-solver')).toEqual({ tier: 'gold', at: 7 });
    // Going up still works, and keeps the first date.
    expect(save.earn([{ id: 'block-clean', tier: 'bronze' }], 50)).toHaveLength(1);
    expect(save.earn([{ id: 'block-clean', tier: 'silver' }], 60)[0]).toMatchObject({
      upgraded: true,
    });
    expect(save.getEarned('block-clean')).toEqual({ tier: 'silver', at: 50 });
  });

  it('marks what is new until the shelf is open, and again when a tier goes up', async () => {
    solved(blockIds.slice(0, 5).map((id) => `block:${id}`));
    const save = await load();
    save.syncBadges();
    expect(save.isNew('block-solver')).toBe(true);
    expect(save.isNew('flat-solver')).toBe(false);
    expect(save.newBadgeCount()).toBeGreaterThan(0);
    save.markBadgesSeen();
    expect(save.isNew('block-solver')).toBe(false);
    expect(save.newBadgeCount()).toBe(0);
    save.earn([{ id: 'block-solver', tier: 'silver' }]);
    expect(save.isNew('block-solver')).toBe(true);
    const reloaded = await load();
    expect(reloaded.isNew('block-solver')).toBe(true);
    reloaded.markBadgesSeen();
    expect(JSON.parse(localStorage.getItem('picross:badges')!).seen).toMatchObject({
      'block-solver': 2,
    });
  });

  it('earns a Both badge as the second board catches up', async () => {
    localStorage.setItem(
      'picross:run',
      JSON.stringify({
        current: null,
        seenScenes: [],
        jobs: { 'first-job': { plays: 2, wins: 2, wonOn: ['block', 'grid'] } },
      }),
    );
    const [a] = shared;
    solved([`grid:${a}`, `block:${a}`]);
    const save = await load();
    const fresh = save.earnFromStats().map((f) => f.badge.id);
    expect(fresh).toContain('second-opinion');
    expect(fresh).toContain('flat-packed');
    expect(save.getEarned('second-opinion')?.at).toBeGreaterThan(0);
  });
});
