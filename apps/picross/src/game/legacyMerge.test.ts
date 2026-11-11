import { describe, expect, it } from 'vitest';
import {
  mergeDailies,
  mergeJob,
  mergeLegacy,
  mergeProgress,
  mergeRuns,
  mergeSettings,
} from './legacyMerge';
import { startRun } from './run';
import type { Settings } from './settings';

describe('free play', () => {
  it("keeps each game's puzzles under its own dimension, so the two mugs stay apart", () => {
    const out = mergeProgress(
      { solved: { mug: { solves: 2, bestTime: 900 }, arrow: { solves: 1, bestTime: 50 } } },
      { solved: { mug: { solves: 1, bestTime: 4000, clean: 1 } } },
    )!;
    expect(out.solved).toEqual({
      'grid:mug': { solves: 2, bestTime: 900 },
      'grid:arrow': { solves: 1, bestTime: 50 },
      'block:mug': { solves: 1, bestTime: 4000, clean: 1 },
    });
  });

  it('keeps boards in progress, each under its dimension', () => {
    const out = mergeProgress(
      { boards: { flag: { cells: '10', elapsed: 5 } } },
      { boards: { flag: { blocks: '02', elapsed: 7 } } },
    )!;
    expect(out.boards).toEqual({
      'grid:flag': { cells: '10', elapsed: 5 },
      'block:flag': { blocks: '02', elapsed: 7 },
    });
  });

  it('keeps time played per dimension (all of it is their sum), and the play-tests', () => {
    const out = mergeProgress({ totalTime: 100 }, { totalTime: 70, playtests: 2 })!;
    expect(out.time).toEqual({ grid: 100, block: 70 });
    expect(out.playtests).toBe(2);
  });

  it('works with only one game, and is missing with neither', () => {
    expect(mergeProgress({ solved: {}, boards: {}, totalTime: 5 }, undefined)).toEqual({
      solved: {},
      boards: {},
      time: { grid: 5 },
    });
    expect(mergeProgress(undefined, { totalTime: 5 })).toEqual({
      solved: {},
      boards: {},
      time: { block: 5 },
    });
    expect(mergeProgress(undefined, undefined)).toBeUndefined();
  });

  it("leaves out an id that can't be qualified, rather than throwing", () => {
    const out = mergeProgress({ solved: { 'a:b': { solves: 1, bestTime: 1 } } }, undefined)!;
    expect(out.solved).toEqual({});
  });
});

describe('jobs', () => {
  it('add up plays, wins and Hits-on wins: these are two games, not two copies', () => {
    expect(
      mergeJob({ plays: 3, wins: 2, hitsOnWins: 1 }, { plays: 2, wins: 1, hitsOnWins: 1 }),
    ).toMatchObject({ plays: 5, wins: 3, hitsOnWins: 2 });
  });

  it('say which boards they were won on', () => {
    expect(mergeJob({ plays: 1, wins: 1 }, { plays: 1, wins: 1 }).wonOn).toEqual(['block', 'grid']);
    expect(mergeJob({ plays: 2, wins: 0 }, { plays: 1, wins: 1 }).wonOn).toEqual(['block']);
    expect(mergeJob({ plays: 1, wins: 1 }, undefined).wonOn).toEqual(['grid']);
    expect(mergeJob({ plays: 1, wins: 0 }, undefined)).not.toHaveProperty('wonOn');
  });

  it('keep the better best HP, trusting a Hits-on best over an old Relaxed one', () => {
    expect(
      mergeJob({ plays: 1, wins: 1, bestHp: 12 }, { plays: 1, wins: 1, bestHp: 9 }).bestHp,
    ).toBe(12);
    expect(
      mergeJob({ plays: 1, wins: 1, bestHp: 12 }, { plays: 1, wins: 1, hitsOnWins: 1, bestHp: 5 })
        .bestHp,
    ).toBe(5);
  });

  it("keep the 2D game's Endless depth, and fields neither knows", () => {
    const flat = { plays: 4, wins: 0, bestDepth: 7, ribbon: 'gold' };
    expect(mergeJob(flat, undefined)).toEqual({ plays: 4, wins: 0, bestDepth: 7, ribbon: 'gold' });
  });

  it("add nothing a job didn't have", () => {
    expect(mergeJob(undefined, { plays: 1, wins: 0 })).toEqual({ plays: 1, wins: 0 });
  });
});

describe('runs', () => {
  const flatRun = { ...startRun('night-shift', 14, 'hearts'), node: 3 };
  const cubedRun = {
    runId: 'first-job',
    node: 1,
    hp: 12,
    status: 'active',
    board: { blocks: '2' },
  };

  it("keep both runs in progress: the 2D one where it was, Cubed's under block, as it was", () => {
    const out = mergeRuns(
      { current: flatRun, currentUpdatedAt: 123, seenScenes: [], jobs: {} },
      { current: cubedRun, seenScenes: [], seenTips: [], jobs: {} },
    )!;
    expect(out.current).toEqual(flatRun);
    expect(out.currentUpdatedAt).toBe(123);
    expect(out.block).toEqual({ current: cubedRun });
  });

  it('make the scenes and tips seen one set', () => {
    const out = mergeRuns(
      { current: null, seenScenes: ['b', 'a'], seenTips: ['fog'], jobs: {} },
      { current: null, seenScenes: ['b', 'c'], seenTips: ['ink'], jobs: {} },
    )!;
    expect(out.seenScenes).toEqual(['a', 'b', 'c']);
    expect(out.seenTips).toEqual(['fog', 'ink']);
  });

  it('merge the jobs job by job', () => {
    const out = mergeRuns(
      { current: null, seenScenes: [], jobs: { 'first-job': { plays: 1, wins: 1 } } },
      {
        current: null,
        seenScenes: [],
        jobs: { 'first-job': { plays: 2, wins: 1 }, 'night-shift': { plays: 1, wins: 0 } },
      },
    )!;
    expect(out.jobs).toEqual({
      'first-job': { plays: 3, wins: 2, wonOn: ['block', 'grid'] },
      'night-shift': { plays: 1, wins: 0 },
    });
  });

  it('work with one game, and are missing with neither', () => {
    const flat = { current: flatRun, seenScenes: ['x'], jobs: {} };
    expect(mergeRuns(flat, undefined)).toEqual(flat);
    expect(mergeRuns(undefined, { current: cubedRun })).toEqual({
      current: null,
      seenScenes: [],
      jobs: {},
      block: { current: cubedRun },
    });
    expect(mergeRuns(undefined, undefined)).toBeUndefined();
  });

  it("let the 2D save's unknown fields through", () => {
    const out = mergeRuns({ current: null, seenScenes: [], jobs: {}, note: 1 } as never, {});
    expect(out).toMatchObject({ note: 1 });
  });
});

describe('settings', () => {
  it("take the 2D game's value where it saved one, and Cubed's where it didn't", () => {
    const out = mergeSettings(
      { muted: false, listFilter: 'todo' },
      { muted: true, listFilter: 'done', mode: 'hearts', haptics: false, listDifficulty: 'hard' },
    );
    expect(out).toEqual({
      muted: false,
      listFilter: 'todo',
      mode: 'hearts',
      haptics: false,
      listDifficulty: 'hard',
    });
  });

  it("are all the 2D game's when it saved them all", () => {
    const flat = {
      mode: 'relaxed',
      listFilter: 'all',
      listOrder: 'desc',
      listDifficulty: 'insane',
      collapsedSections: ['murals'],
      muted: true,
      highContrast: false,
      haptics: true,
    } satisfies Partial<Settings>;
    const cubed = {
      mode: 'hearts',
      listFilter: 'done',
      listDifficulty: 'easy',
      muted: false,
      highContrast: true,
      haptics: false,
    } as const;
    expect(mergeSettings(flat, cubed)).toEqual(flat);
  });

  it("bring in Cubed's own as dimDone and cubedTutorialDone", () => {
    expect(mergeSettings(undefined, { dimDone: false, tutorialDone: true })).toEqual({
      dimDone: false,
      cubedTutorialDone: true,
    });
  });

  it('remember the last game picked as the free-play tab', () => {
    expect(mergeSettings(undefined, undefined, 'cubed')).toEqual({ freePlayTab: 'cubed' });
    expect(mergeSettings({ muted: false }, undefined, 'flat')).toEqual({
      muted: false,
      freePlayTab: 'flat',
    });
    expect(mergeSettings({}, undefined, 'moon')).toEqual({});
  });

  it('are missing when neither game saved any', () => {
    expect(mergeSettings(undefined, undefined, null)).toBeUndefined();
  });
});

describe('the whole save', () => {
  it('leaves the dailies and badges out (#156, #157 merge them)', () => {
    const out = mergeLegacy(
      { progress: { totalTime: 1 }, game: 'flat' },
      { progress: { totalTime: 2 } },
    );
    expect(Object.keys(out).sort()).toEqual(['progress', 'settings']);
  });

  it('is empty when neither game was played', () => {
    expect(mergeLegacy({}, {})).toEqual({});
  });
});

describe('the dailies (#156)', () => {
  // 2026-11-11 is a Cubed day (even since the epoch), 2026-11-12 a Flat one.
  const flat = (lastSolved: string, streak: number, rest = {}) => ({
    lastSolved,
    streak,
    best: streak,
    solves: streak,
    ...rest,
  });
  const cubed = (times: Record<string, number>, rest = {}) => {
    const days = Object.keys(times).sort();
    return { times, last: days[days.length - 1], streak: 1, best: 1, ...rest };
  };

  it("rebuilds the 2D game's days from its streak", () => {
    const out = mergeDailies(flat('2026-11-03', 3, { solves: 10, best: 6 }), undefined)!;
    expect(out).toEqual({
      days: {
        '2026-11-01': { dimension: 'grid' },
        '2026-11-02': { dimension: 'grid' },
        '2026-11-03': { dimension: 'grid' },
      },
      lastSolved: '2026-11-03',
      streak: 3,
      best: 6,
      solves: 10,
    });
  });

  it("takes Cubed's days and times as they were", () => {
    const out = mergeDailies(undefined, cubed({ '2026-11-01': 500, '2026-11-03': 400 }))!;
    expect(out.days).toEqual({
      '2026-11-01': { dimension: 'block', time: 500 },
      '2026-11-03': { dimension: 'block', time: 400 },
    });
    expect(out).toMatchObject({ lastSolved: '2026-11-03', streak: 1, best: 1, solves: 2 });
  });

  it('joins days from both games into one streak, across a month', () => {
    const out = mergeDailies(
      flat('2026-10-30', 2),
      cubed({ '2026-10-31': 300, '2026-11-01': 200 }, { streak: 2, best: 2 }),
    )!;
    expect(Object.keys(out.days)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(out).toMatchObject({ lastSolved: '2026-11-01', streak: 4, best: 4, solves: 4 });
  });

  it("takes the longer game's streak when they overlap", () => {
    const out = mergeDailies(
      flat('2026-11-05', 5),
      cubed({ '2026-11-04': 300, '2026-11-05': 200 }, { streak: 2 }),
    )!;
    expect(out).toMatchObject({ streak: 5, best: 5 });
    // A day solved in both was two puzzles.
    expect(out.solves).toBe(7);
    expect(Object.keys(out.days)).toHaveLength(5);
  });

  it("keeps the board that day's one daily is on when both games solved it", () => {
    const out = mergeDailies(
      flat('2026-11-12', 2),
      cubed({ '2026-11-11': 300, '2026-11-12': 200 }, { streak: 2 }),
    )!;
    expect(out.days).toEqual({
      '2026-11-11': { dimension: 'block', time: 300 },
      '2026-11-12': { dimension: 'grid' },
    });
  });

  it('has a gap break the streak, and keeps the longest run as the best', () => {
    const out = mergeDailies(
      flat('2026-11-03', 3, { best: 2 }),
      cubed({ '2026-11-05': 100, '2026-11-06': 100 }, { streak: 2, best: 2 }),
    )!;
    expect(out).toMatchObject({ lastSolved: '2026-11-06', streak: 2, best: 3 });
  });

  it('keeps a streak as of its last day, which is 0 on the day once a day is missed', () => {
    // Long ago: the streak stands as of then, and the daily shows it broken (dailyStreak).
    const out = mergeDailies(flat('2020-01-10', 4), undefined)!;
    expect(out).toMatchObject({ lastSolved: '2020-01-10', streak: 4, best: 4 });
  });

  it('keeps the best ever, even from a streak since broken', () => {
    const out = mergeDailies(
      flat('2026-11-03', 1, { best: 30, solves: 40 }),
      cubed({}, { best: 12, streak: 0, last: undefined }),
    )!;
    expect(out).toMatchObject({ streak: 1, best: 30, solves: 40 });
  });

  it("keeps a 2D board in progress for a Flat day, and never Cubed's", () => {
    const board = { day: '2026-11-12', saved: { cells: '01', elapsed: 9 } };
    const cubedBoard = { blocks: '012', elapsed: 5, date: '2026-11-11' };
    const out = mergeDailies(
      flat('2026-11-10', 1, { board }),
      cubed({ '2026-11-10': 1 }, { board: cubedBoard }),
    )!;
    expect(out.board).toEqual({ ...board, dimension: 'grid' });
    // Cubed's days have new puzzles now, so its board (even today's) would be another block's.
    const only = mergeDailies(undefined, cubed({}, { board: cubedBoard, streak: 0 }))!;
    expect(only).not.toHaveProperty('board');
  });

  it("drops a 2D board for what's now a Cubed day, or one from before the last solve", () => {
    const saved = { cells: '01', elapsed: 9 };
    expect(
      mergeDailies(flat('2026-11-01', 1, { board: { day: '2026-11-11', saved } }), undefined),
    ).not.toHaveProperty('board');
    expect(
      mergeDailies(flat('2026-11-14', 1, { board: { day: '2026-11-12', saved } }), undefined),
    ).not.toHaveProperty('board');
  });

  it('leaves out what it cannot read, and has nothing when neither game played', () => {
    expect(mergeDailies(undefined, undefined)).toBeUndefined();
    const out = mergeDailies(
      { lastSolved: 'yesterday', streak: -3, solves: Number.NaN },
      { times: { nope: 5, '2026-11-11': -1 } },
    )!;
    expect(out).toEqual({ days: {}, streak: 0, best: 0, solves: 0 });
  });
});
