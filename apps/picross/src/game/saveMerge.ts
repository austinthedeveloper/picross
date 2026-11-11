import { dayNumber, previousDay } from '@picross/shared/puzzles/days';
import type { Tier } from '../puzzles/badges';
import type { BadgeSave, Earned } from './badges';
import type { DailySave, DaySolved } from './daily';
import {
  combine,
  either,
  higher,
  lower,
  mergeBestHp,
  mergeRecord,
  present,
  union,
  unknownFields,
} from './merging';
import type { BlockSavedBoard, PuzzleStats, SavedBoard, SaveData } from './progress';
import type { BlockRunSave, JobStats, RunSave } from './runSave';

/**
 * Combines two copies of a save (#97), so nobody has to answer "which save do you
 * want to keep?". It has no network or DOM. The order and repeats never matter:
 * `mergeSaves(a, b)` equals `mergeSaves(b, a)`, and merging a save with itself
 * changes nothing. Lists that act as sets come back sorted.
 *
 * Settings and the editor's drawing aren't here: they belong to one device. Since the
 * first-launch merge (#155) `progress` and `run` hold both games' (`picross:v2`, and
 * Cubed's run as `run.block`), and since #156 `daily` is both games' too, and since #157
 * `badges` (Cubed's as `block-` ids).
 */
export interface SaveBundle {
  version: number;
  progress?: SaveData;
  run?: RunSave;
  daily?: DailySave;
  badges?: BadgeSave;
}

/**
 * 2: progress is `picross:v2` (qualified ids, time per dimension), and runs have `block`.
 * 3: the one daily (#156): `daily` is `picross:daily2`, with its days and both boards'.
 * 4: one badge shelf (#157): `badges` holds Cubed's too, and `seen`.
 */
export const SAVE_VERSION = 4;

const mergeStats = (a: PuzzleStats, b: PuzzleStats): PuzzleStats =>
  present({
    ...unknownFields(a, b),
    solves: Math.max(a.solves, b.solves),
    bestTime: Math.min(a.bestTime, b.bestTime),
    clean: higher(a.clean, b.clean),
  });

type AnyBoard = SavedBoard | BlockSavedBoard;

const laterBoard = <B extends AnyBoard>(a: B, b: B): B => {
  const [x, y] = [a.elapsed ?? 0, b.elapsed ?? 0];
  return x === y ? either(a, b) : x > y ? a : b;
};

function mergeBoards(a: SaveData, b: SaveData): Record<string, AnyBoard> {
  const out: Record<string, AnyBoard> = {};
  const [boardsA, boardsB] = [a.boards ?? {}, b.boards ?? {}];
  for (const id of new Set([...Object.keys(boardsA), ...Object.keys(boardsB)])) {
    const [solvesA, solvesB] = [a.solved?.[id]?.solves ?? 0, b.solved?.[id]?.solves ?? 0];
    // A board behind the other side's solves is from before that solve: it's finished.
    const board = combine(
      solvesA >= solvesB ? boardsA[id] : undefined,
      solvesB >= solvesA ? boardsB[id] : undefined,
      laterBoard,
    );
    if (board) out[id] = board;
  }
  return out;
}

const mergeProgress = (a: SaveData, b: SaveData): SaveData => ({
  ...(unknownFields(a, b) as object),
  solved: mergeRecord(a.solved, b.solved, mergeStats) ?? {},
  boards: mergeBoards(a, b),
  time: mergeRecord(a.time, b.time, Math.max) ?? {},
  ...present({ playtests: higher(a.playtests, b.playtests) }),
});

const mergeJob = (a: JobStats, b: JobStats): JobStats =>
  present({
    ...unknownFields(a, b),
    plays: Math.max(a.plays, b.plays),
    wins: Math.max(a.wins, b.wins),
    hitsOnWins: higher(a.hitsOnWins, b.hitsOnWins),
    bestHp: mergeBestHp(a, b),
    bestDepth: higher(a.bestDepth, b.bestDepth),
    wonOn: union(a.wonOn, b.wonOn),
  });

/**
 * A run is taken whole from whichever side changed it last. On a tie only the runs are
 * compared, so the rest of the save can't change which one wins.
 */
function newerRun<R extends { current: unknown; currentUpdatedAt?: number }>(a: R, b: R): R {
  const [atA, atB] = [a.currentUpdatedAt ?? 0, b.currentUpdatedAt ?? 0];
  if (atA !== atB) return atA > atB ? a : b;
  return either(a.current, b.current) === a.current ? a : b;
}

const mergeBlockRun = (a: BlockRunSave, b: BlockRunSave): BlockRunSave => {
  const newer = newerRun(a, b);
  return present({
    ...unknownFields(a, b),
    current: newer.current,
    currentUpdatedAt: higher(a.currentUpdatedAt, b.currentUpdatedAt),
  });
};

function mergeRun(a: RunSave, b: RunSave): RunSave {
  // The run is taken whole: two half-runs blended together would be neither. So is a
  // fight's every board (`fight`, #169), saved either way: the run save reads both. Each
  // game's run goes by its own date.
  const newer = newerRun(a, b);
  return present({
    ...unknownFields(a, b),
    current: newer.current,
    currentUpdatedAt: higher(a.currentUpdatedAt, b.currentUpdatedAt),
    seenScenes: union(a.seenScenes, b.seenScenes) ?? [],
    seenTips: union(a.seenTips, b.seenTips),
    jobs: mergeRecord(a.jobs, b.jobs, mergeJob) ?? {},
    block: combine(a.block, b.block, mergeBlockRun),
  });
}

type DailyBoard = NonNullable<DailySave['board']>;

function mergeDailyBoard(a: DailyBoard, b: DailyBoard): DailyBoard {
  if (a.day !== b.day) return dayNumber(a.day) > dayNumber(b.day) ? a : b;
  const saved = laterBoard(a.saved, b.saved);
  return saved === a.saved ? a : b;
}

const mergeDay = (a: DaySolved, b: DaySolved): DaySolved =>
  present({
    ...unknownFields(a, b),
    dimension: either(a.dimension, b.dimension),
    time: lower(a.time, b.time),
  });

/** How many days in a row `days` has, ending at `last`. */
function runTo(days: Record<string, unknown>, last: string): number {
  let run = 0;
  for (let day = last; days[day]; day = previousDay(day)) run++;
  return run;
}

/**
 * The one daily (#156). Days solved on either side all count, so the streak is the run in
 * them ending at the last day solved (a streak played half on each device joins up), or
 * that side's own streak if it's longer (a save from before its days were listed).
 */
function mergeDaily(a: DailySave, b: DailySave): DailySave {
  const dayOf = (save: DailySave) => (save.lastSolved ? dayNumber(save.lastSolved) : -Infinity);
  const [dayA, dayB] = [dayOf(a), dayOf(b)];
  const latest = dayA === dayB ? (a.streak >= b.streak ? a : b) : dayA > dayB ? a : b;
  const days = mergeRecord(a.days ?? {}, b.days ?? {}, mergeDay)!;
  const streak = latest.lastSolved
    ? Math.max(latest.streak, runTo(days, latest.lastSolved))
    : latest.streak;
  // Each side's count, plus the days only the other side solved: a day solved on both
  // devices is one solve, and a day solved on one isn't lost.
  const only = (x: DailySave, y: DailySave) =>
    Object.keys(y.days ?? {}).filter((day) => !x.days?.[day]).length;
  const board = combine(a.board, b.board, mergeDailyBoard);
  return present({
    ...unknownFields(a, b),
    days,
    lastSolved: latest.lastSolved,
    streak,
    best: Math.max(a.best, b.best, streak),
    solves: Math.max(a.solves + only(a, b), b.solves + only(b, a)),
    // Solving a daily finishes its board, and a board from before it can't be played.
    board: board && dayNumber(board.day) > dayOf(latest) ? board : undefined,
  });
}

const TIERS: (Tier | undefined)[] = [undefined, 'bronze', 'silver', 'gold'];

const mergeEarned = (a: Earned, b: Earned): Earned =>
  present({
    ...unknownFields(a, b),
    tier: TIERS.indexOf(a.tier) >= TIERS.indexOf(b.tier) ? a.tier : b.tier,
    // A real date beats a badge awarded from an older save, which has none.
    at: lower(a.at, b.at),
  });

const mergeBadges = (a: BadgeSave, b: BadgeSave): BadgeSave =>
  present({
    ...(unknownFields(a, b) as object),
    earned: mergeRecord(a.earned, b.earned, mergeEarned) ?? {},
    // Seen on either device is seen.
    seen: mergeRecord(a.seen, b.seen, Math.max),
  });

export function mergeSaves(a: SaveBundle, b: SaveBundle): SaveBundle {
  return present({
    ...unknownFields(a, b),
    version: Math.max(a.version ?? 0, b.version ?? 0),
    progress: combine(a.progress, b.progress, mergeProgress),
    run: combine(a.run, b.run, mergeRun),
    daily: combine(a.daily, b.daily, mergeDaily),
    badges: combine(a.badges, b.badges, mergeBadges),
  });
}
