import { describe, expect, it } from 'vitest';
import { random } from '@picross/shared/engine/random';
import { loadFight, saveFight } from './fightSave';
import { startRun, withBattle, withBlock, withBoard } from './run';
import type { SavedBoard, SaveData } from './progress';
import { mergeSaves, SAVE_VERSION, type SaveBundle } from './saveMerge';

const bundle = (rest: Partial<SaveBundle>): SaveBundle => ({ version: SAVE_VERSION, ...rest });
const progress = (rest = {}) => ({ solved: {}, boards: {}, time: {}, ...rest });
const run = (rest = {}) => ({ current: null, seenScenes: [], jobs: {}, ...rest });
const daily = (rest = {}) => ({ days: {}, streak: 0, best: 0, solves: 0, ...rest });

/** Merges both ways round, checks they agree, and returns the result. */
function merged(a: SaveBundle, b: SaveBundle) {
  const out = mergeSaves(a, b);
  expect(mergeSaves(b, a)).toEqual(out);
  return out;
}

describe('free-play progress', () => {
  const merge = (a = {}, b = {}) => {
    const out = merged(bundle({ progress: progress(a) }), bundle({ progress: progress(b) }));
    return out.progress! as SaveData & { boards: Record<string, SavedBoard> };
  };

  it('keeps the lower best time and the higher solve count', () => {
    const out = merge(
      { solved: { p: { solves: 1, bestTime: 500 } } },
      { solved: { p: { solves: 4, bestTime: 900 } } },
    );
    expect(out.solved.p).toEqual({ solves: 4, bestTime: 500 });
  });

  it('keeps puzzles only one side solved', () => {
    const out = merge(
      { solved: { p: { solves: 1, bestTime: 5 } } },
      { solved: { q: { solves: 2, bestTime: 6 } } },
    );
    expect(Object.keys(out.solved).sort()).toEqual(['p', 'q']);
  });

  it('takes the higher time in each dimension rather than adding up', () => {
    const out = merge({ time: { grid: 100, block: 5 } }, { time: { grid: 70, block: 9 } });
    expect(out.time).toEqual({ grid: 100, block: 9 });
    expect(merge({ time: { grid: 1 } }).time).toEqual({ grid: 1 });
  });

  it('keeps the higher clean count and play-tests (Cubed, #155)', () => {
    const out = merge(
      { solved: { 'block:mug': { solves: 3, bestTime: 9, clean: 1 } }, playtests: 2 },
      { solved: { 'block:mug': { solves: 2, bestTime: 8, clean: 2 } } },
    );
    expect(out.solved['block:mug']).toEqual({ solves: 3, bestTime: 8, clean: 2 });
    expect(out.playtests).toBe(2);
    expect(merge()).not.toHaveProperty('playtests');
  });

  it('keeps the two dimensions apart', () => {
    const out = merge(
      { solved: { 'grid:mug': { solves: 1, bestTime: 5 } } },
      { solved: { 'block:mug': { solves: 2, bestTime: 6 } } },
    );
    expect(Object.keys(out.solved).sort()).toEqual(['block:mug', 'grid:mug']);
  });

  it('keeps the board with the most time on it', () => {
    const out = merge(
      { boards: { p: { cells: '10', elapsed: 50 } } },
      { boards: { p: { cells: '11', elapsed: 90 } } },
    );
    expect(out.boards.p.cells).toBe('11');
  });

  it('keeps a board only one side has', () => {
    expect(merge({ boards: { p: { cells: '1' } } }).boards.p.cells).toBe('1');
  });

  it('drops a board when the other side has more solves of that puzzle', () => {
    const out = merge(
      { boards: { p: { cells: '10', elapsed: 90 } } },
      { solved: { p: { solves: 1, bestTime: 5 } } },
    );
    expect(out.boards.p).toBeUndefined();
    expect(out.solved.p.solves).toBe(1);
  });

  it('keeps a board started after a solve both sides know about', () => {
    const solved = { p: { solves: 1, bestTime: 5 } };
    const out = merge({ solved, boards: { p: { cells: '10' } } }, { solved });
    expect(out.boards.p.cells).toBe('10');
  });

  it('prefers the newer board over an older one with more time, when solves differ', () => {
    const out = merge(
      { solved: { p: { solves: 2, bestTime: 5 } }, boards: { p: { cells: '10', elapsed: 1 } } },
      { solved: { p: { solves: 1, bestTime: 5 } }, boards: { p: { cells: '11', elapsed: 99 } } },
    );
    expect(out.boards.p.cells).toBe('10');
  });
});

describe('runs and jobs', () => {
  const merge = (a = {}, b = {}) => merged(bundle({ run: run(a) }), bundle({ run: run(b) })).run!;

  it('takes the whole run from whichever side changed it last', () => {
    const older = { ...startRun('a', 10), node: 5, hp: 1 };
    const newer = { ...startRun('b', 20), node: 1 };
    const out = merge(
      { current: older, currentUpdatedAt: 100 },
      { current: newer, currentUpdatedAt: 200 },
    );
    expect(out.current).toEqual(newer);
    expect(out.currentUpdatedAt).toBe(200);
  });

  it('counts a cleared run as a change', () => {
    const out = merge(
      { current: startRun('a', 10), currentUpdatedAt: 100 },
      { current: null, currentUpdatedAt: 200 },
    );
    expect(out.current).toBeNull();
  });

  it('treats a save from before the stamp as oldest', () => {
    const newer = startRun('b', 20);
    const out = merge({ current: startRun('a', 10) }, { current: newer, currentUpdatedAt: 1 });
    expect(out.current).toEqual(newer);
  });

  it('takes a fight whole, saved before #169 or after, so its boards stay together', () => {
    let fight = withBattle(withBoard(startRun('closing-time', 18), { cells: '01' }), {
      enemyHp: 30,
      struck: ['r1'],
      phase: 4,
    });
    fight = withBlock(fight, { board: { blocks: '20' }, battle: { enemyHp: 70, phase: 3 } });
    const saved = saveFight(fight);
    const older = { ...fight, node: 2, block: undefined };
    for (const [a, b] of [
      [older, saved],
      [saveFight(older), saved],
      [saveFight(older), fight],
    ]) {
      const out = merge(
        { current: a, currentUpdatedAt: 100 },
        { current: b, currentUpdatedAt: 200 },
      );
      expect(out.current).toBe(b);
      expect(loadFight(out.current!)).toEqual(fight);
    }
    // The same run saved both ways, at once: either side loads as the same fight.
    const tie = merge(
      { current: fight, currentUpdatedAt: 5 },
      { current: saved, currentUpdatedAt: 5 },
    );
    expect(loadFight(tie.current!)).toEqual(fight);
  });

  it('adds no stamp when neither side has one', () => {
    expect(merge()).not.toHaveProperty('currentUpdatedAt');
  });

  it('merges seen scenes and tips as sets', () => {
    const out = merge(
      { seenScenes: ['b', 'a'], seenTips: ['fog'] },
      { seenScenes: ['b', 'c'], seenTips: ['ink'] },
    );
    expect(out.seenScenes).toEqual(['a', 'b', 'c']);
    expect(out.seenTips).toEqual(['fog', 'ink']);
  });

  it('copes with saves from before tips, and adds nothing to them', () => {
    expect(merge({}, { seenTips: ['fog'] }).seenTips).toEqual(['fog']);
    expect(merge()).not.toHaveProperty('seenTips');
  });

  it('takes the higher of each job field, which keeps unlocks', () => {
    const out = merge(
      { jobs: { j: { plays: 5, wins: 0, hitsOnWins: 0 } } },
      { jobs: { j: { plays: 2, wins: 1, hitsOnWins: 1, bestHp: 7 }, k: { plays: 1, wins: 0 } } },
    );
    expect(out.jobs.j).toEqual({ plays: 5, wins: 1, hitsOnWins: 1, bestHp: 7 });
    expect(out.jobs.k).toEqual({ plays: 1, wins: 0 });
  });

  it('keeps the deeper Endless run', () => {
    const out = merge(
      { jobs: { endless: { plays: 1, wins: 0, bestDepth: 4 } } },
      { jobs: { endless: { plays: 1, wins: 0, bestDepth: 9 } } },
    );
    expect(out.jobs.endless.bestDepth).toBe(9);
  });

  it("doesn't let an old Relaxed best HP beat a real Hits-on one", () => {
    const out = merge(
      { jobs: { j: { plays: 1, wins: 1, bestHp: 12 } } },
      { jobs: { j: { plays: 1, wins: 1, hitsOnWins: 1, bestHp: 5 } } },
    );
    expect(out.jobs.j.bestHp).toBe(5);
  });

  it('merges the boards a job was won on as a set', () => {
    const out = merge(
      { jobs: { j: { plays: 1, wins: 1, wonOn: ['grid'] } } },
      { jobs: { j: { plays: 2, wins: 2, wonOn: ['block', 'grid'] } } },
    );
    expect(out.jobs.j.wonOn).toEqual(['block', 'grid']);
  });

  it("takes Cubed's run whole by its own date, apart from the 2D run", () => {
    const flat = { ...startRun('a', 10), node: 2 };
    const older = { runId: 'b', node: 1 };
    const newer = { runId: 'c', node: 4 };
    const out = merge(
      { current: flat, currentUpdatedAt: 300, block: { current: older, currentUpdatedAt: 100 } },
      { current: null, currentUpdatedAt: 200, block: { current: newer, currentUpdatedAt: 200 } },
    );
    expect(out.current).toEqual(flat);
    expect(out.block).toEqual({ current: newer, currentUpdatedAt: 200 });
    expect(merge({}, { block: { current: older } }).block).toEqual({ current: older });
    expect(merge()).not.toHaveProperty('block');
  });
});

describe('the daily', () => {
  const merge = (a = {}, b = {}) =>
    merged(bundle({ daily: daily(a) }), bundle({ daily: daily(b) })).daily!;

  it('takes the later day, with its streak', () => {
    const out = merge(
      { lastSolved: '2026-11-03', streak: 9 },
      { lastSolved: '2026-11-05', streak: 1 },
    );
    expect(out).toMatchObject({ lastSolved: '2026-11-05', streak: 1 });
  });

  it('takes the higher streak on the same day', () => {
    const out = merge(
      { lastSolved: '2026-11-05', streak: 2 },
      { lastSolved: '2026-11-05', streak: 6 },
    );
    expect(out.streak).toBe(6);
  });

  it('takes the side that has solved one', () => {
    expect(merge({}, { lastSolved: '2026-11-05', streak: 1 }).lastSolved).toBe('2026-11-05');
  });

  it('keeps the higher best and solve count, so a broken streak keeps its badges', () => {
    const out = merge({ best: 30, solves: 40 }, { best: 2, solves: 50 });
    expect(out).toMatchObject({ best: 30, solves: 50 });
  });

  const board = (day: string, elapsed: number) => ({
    day,
    dimension: 'grid' as const,
    saved: { cells: '1', elapsed },
  });

  it('keeps the board with more time on the same day', () => {
    const out = merge({ board: board('2026-11-05', 10) }, { board: board('2026-11-05', 20) });
    expect(out.board?.saved.elapsed).toBe(20);
  });

  it('keeps the later board across days', () => {
    const out = merge({ board: board('2026-11-04', 99) }, { board: board('2026-11-05', 1) });
    expect(out.board?.day).toBe('2026-11-05');
  });

  it('drops the board once that day is solved', () => {
    const out = merge({ board: board('2026-11-05', 10) }, { lastSolved: '2026-11-05', streak: 1 });
    expect(out).not.toHaveProperty('board');
  });

  it('drops a board from before the last day solved, so it can never come back', () => {
    const out = merge({ board: board('2026-11-04', 10) }, { lastSolved: '2026-11-05', streak: 1 });
    expect(out).not.toHaveProperty('board');
  });

  it('keeps a board for a day after the last one solved', () => {
    const out = merge({ board: board('2026-11-05', 10) }, { lastSolved: '2026-11-04', streak: 1 });
    expect(out.board?.day).toBe('2026-11-05');
  });

  const solvedDays = (...days: string[]) => ({
    days: Object.fromEntries(days.map((day, i) => [day, { dimension: i % 2 ? 'block' : 'grid' }])),
    lastSolved: days[days.length - 1],
    streak: days.length,
    best: days.length,
    solves: days.length,
  });

  it('joins up a streak played partly on each device (#156)', () => {
    const out = merge(solvedDays('2026-11-01', '2026-11-02'), {
      ...solvedDays('2026-11-03'),
      streak: 1,
    });
    expect(out).toMatchObject({ lastSolved: '2026-11-03', streak: 3, best: 3, solves: 3 });
    expect(Object.keys(out.days).sort()).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('counts a day solved on both devices once, and keeps its better time', () => {
    const a = {
      ...solvedDays('2026-11-04'),
      days: { '2026-11-04': { dimension: 'grid', time: 90 } },
    };
    const b = {
      ...solvedDays('2026-11-04'),
      days: { '2026-11-04': { dimension: 'grid', time: 60 } },
    };
    expect(merge(a, b)).toMatchObject({ solves: 1, days: { '2026-11-04': { time: 60 } } });
  });

  it("keeps solves from before the days were listed, and adds the other side's days", () => {
    const out = merge({ ...solvedDays('2026-11-04'), solves: 40 }, solvedDays('2026-11-05'));
    expect(out.solves).toBe(41);
  });
});

describe('badges', () => {
  const merge = (a = {}, b = {}) =>
    merged(bundle({ badges: { earned: a } }), bundle({ badges: { earned: b } })).badges!.earned;

  it('keeps badges from both sides', () => {
    const out = merge({ a: { at: 1 } }, { b: { at: 2 } });
    expect(Object.keys(out).sort()).toEqual(['a', 'b']);
  });

  it('keeps the higher tier and the earlier date', () => {
    const out = merge({ a: { tier: 'gold', at: 500 } }, { a: { tier: 'bronze', at: 100 } });
    expect(out.a).toEqual({ tier: 'gold', at: 100 });
  });

  it('lets a real date beat a badge awarded from an older save', () => {
    const out = merge({ a: { tier: 'bronze' } }, { a: { tier: 'silver', at: 100 } });
    expect(out.a).toEqual({ tier: 'silver', at: 100 });
  });

  it('adds no date or tier when neither side has one', () => {
    expect(merge({ a: {} }, { a: {} }).a).toEqual({});
  });

  it("keeps the higher level seen of each, Cubed's badges too (#157)", () => {
    const out = merged(
      bundle({ badges: { earned: {}, seen: { a: 1, 'block-solver': 3 } } }),
      bundle({ badges: { earned: {}, seen: { a: 2, b: 1 } } }),
    ).badges!;
    expect(out.seen).toEqual({ a: 2, b: 1, 'block-solver': 3 });
    expect(
      merged(bundle({ badges: { earned: {} } }), bundle({ badges: { earned: {} } })).badges,
    ).toEqual({
      earned: {},
    });
  });
});

describe('the save as a whole', () => {
  it('keeps the higher version', () => {
    expect(merged({ version: 1 }, { version: 3 }).version).toBe(3);
  });

  it('keeps a section only one side has', () => {
    const out = merged(bundle({ daily: daily({ best: 3 }) }), bundle({ badges: { earned: {} } }));
    expect(out.daily?.best).toBe(3);
    expect(out.badges).toEqual({ earned: {} });
  });

  it('lets fields it does not know pass through, at every level', () => {
    const a = {
      version: 1,
      fromTheFuture: 'top',
      progress: progress({ note: 'p', solved: { x: { solves: 1, bestTime: 2, gold: true } } }),
      run: run({ note: 'r', jobs: { j: { plays: 1, wins: 0, ribbon: 1 } } }),
      daily: daily({ note: 'd' }),
      badges: { note: 'b', earned: { x: { note: 'e' } } },
    } as unknown as SaveBundle;
    const out = merged(a, { version: 1 }) as unknown as typeof a & Record<string, unknown>;
    expect(out.fromTheFuture).toBe('top');
    const other = {
      version: 1,
      progress: progress({ solved: { x: { solves: 2, bestTime: 1 } } }),
      run: run({ jobs: { j: { plays: 2, wins: 0 } } }),
      daily: daily(),
      badges: { earned: { x: {} } },
    } as SaveBundle;
    const deep = merged(a, other) as unknown as Record<string, Record<string, unknown>>;
    expect(deep.progress.note).toBe('p');
    expect(deep.progress.solved).toMatchObject({ x: { gold: true, solves: 2, bestTime: 1 } });
    expect(deep.run.note).toBe('r');
    expect(deep.run.jobs).toMatchObject({ j: { ribbon: 1, plays: 2 } });
    expect(deep.daily.note).toBe('d');
    expect(deep.badges.note).toBe('b');
    expect(deep.badges.earned).toMatchObject({ x: { note: 'e' } });
  });

  it('merges saves from before tips, stamps, and badges', () => {
    const old = bundle({
      progress: progress({ solved: { p: { solves: 1, bestTime: 9 } }, time: { grid: 9 } }),
      run: run({ seenScenes: ['s'], jobs: { j: { plays: 1, wins: 1, bestHp: 3 } } }),
      daily: daily({ best: 1, solves: 1, streak: 1, lastSolved: '2026-01-01' }),
    });
    expect(merged(old, old)).toEqual(old);
    const now = bundle({
      run: run({ seenTips: ['fog'], currentUpdatedAt: 5 }),
      badges: { earned: {} },
    });
    expect(merged(old, now).run).toMatchObject({ seenTips: ['fog'], currentUpdatedAt: 5 });
  });
});

describe('order and repeats never matter', () => {
  /** A believable save from a seed: the same seed, the same save. */
  function save(seed: number): SaveBundle {
    const next = random(seed);
    const n = (max: number) => Math.floor(next() * max);
    const chance = () => next() < 0.5;
    const ids = ['p', 'q', 'r', 's'];
    const solved: Record<string, { solves: number; bestTime: number }> = {};
    const boards: Record<string, { cells: string; elapsed: number }> = {};
    for (const id of ids) {
      if (chance()) solved[id] = { solves: 1 + n(3), bestTime: 1 + n(5) };
      if (chance()) boards[id] = { cells: String(n(4)), elapsed: n(4) };
    }
    const jobs: Record<
      string,
      {
        plays: number;
        wins: number;
        hitsOnWins?: number;
        bestHp?: number;
        wonOn?: ('grid' | 'block')[];
      }
    > = {};
    for (const id of ids) {
      if (!chance()) continue;
      const wins = n(3);
      jobs[id] = { plays: wins + n(3), wins };
      if (chance()) jobs[id].bestHp = n(9);
      if (chance()) jobs[id].hitsOnWins = n(3);
      if (wins && chance()) jobs[id].wonOn = chance() ? ['grid'] : ['block', 'grid'];
    }
    const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
    // A real save's days end at lastSolved, and its streak is the run ending there.
    const solvedDays = days.filter(chance);
    const lastSolved = solvedDays[solvedDays.length - 1];
    let streak = 0;
    for (let i = days.indexOf(lastSolved); i >= 0 && solvedDays.includes(days[i]); i--) streak++;
    // Solving a daily clears its board, so a real save never has one from before.
    const open = days.filter((day) => !lastSolved || day > lastSolved);
    const earned: Record<string, { tier?: 'bronze' | 'silver' | 'gold'; at?: number }> = {};
    for (const id of ids) {
      if (!chance()) continue;
      earned[id] = {};
      if (chance()) earned[id].tier = (['bronze', 'silver', 'gold'] as const)[n(3)];
      if (chance()) earned[id].at = 1 + n(5);
    }
    return bundle({
      progress: { solved, boards, time: { grid: n(50), ...(chance() ? { block: n(50) } : {}) } },
      run: {
        current: chance() ? { ...startRun('j', 10), node: n(4) } : null,
        ...(chance() ? { currentUpdatedAt: n(4) } : {}),
        seenScenes: ids.filter(chance),
        ...(chance() ? { seenTips: ids.filter(chance) } : {}),
        jobs,
        ...(chance()
          ? {
              block: {
                current: chance() ? { runId: 'k', node: n(4) } : null,
                ...(chance() ? { currentUpdatedAt: n(4) } : {}),
              },
            }
          : {}),
      },
      daily: {
        days: Object.fromEntries(
          solvedDays.map((day) => [
            day,
            {
              dimension: chance() ? ('grid' as const) : ('block' as const),
              ...(chance() ? { time: 1 + n(9) } : {}),
            },
          ]),
        ),
        streak,
        best: streak + n(9),
        solves: solvedDays.length + n(9),
        ...(lastSolved ? { lastSolved } : {}),
        ...(open.length && chance()
          ? {
              board: {
                day: open[n(open.length)],
                dimension: 'grid' as const,
                saved: { cells: '1', elapsed: n(4) },
              },
            }
          : {}),
      },
      badges: { earned },
    });
  }

  const seeds = Array.from({ length: 300 }, (_, i) => i + 1);

  it('merge(a, b) equals merge(b, a)', () => {
    for (const seed of seeds) {
      const [a, b] = [save(seed), save(seed + 1000)];
      expect(mergeSaves(a, b), `seed ${seed}`).toEqual(mergeSaves(b, a));
    }
  });

  it('merge(a, a) equals a', () => {
    for (const seed of seeds) {
      const a = save(seed);
      expect(mergeSaves(a, a), `seed ${seed}`).toEqual(a);
    }
  });

  it('syncing the same save again changes nothing', () => {
    for (const seed of seeds) {
      const [a, b] = [save(seed), save(seed + 1000)];
      const once = mergeSaves(a, b);
      expect(mergeSaves(once, b), `seed ${seed}`).toEqual(once);
      expect(mergeSaves(once, once), `seed ${seed}`).toEqual(once);
    }
  });
});
