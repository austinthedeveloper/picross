import { dayNumber } from '../puzzles/daily';
import type { Tier } from '../puzzles/badges';
import type { BadgeSave, Earned } from './badges';
import type { DailySave } from './daily';
import type { PuzzleStats, SavedBoard, SaveData } from './progress';
import type { JobStats, RunSave } from './runSave';

/**
 * Combines two copies of a save (#97), so nobody has to answer "which save do you
 * want to keep?". It has no network or DOM. The order and repeats never matter:
 * `mergeSaves(a, b)` equals `mergeSaves(b, a)`, and merging a save with itself
 * changes nothing. Lists that act as sets come back sorted.
 *
 * Settings and the editor's drawing aren't here: they belong to one device.
 */
export interface SaveBundle {
  version: number;
  progress?: SaveData;
  run?: RunSave;
  daily?: DailySave;
  badges?: BadgeSave;
}

export const SAVE_VERSION = 1;

type Loose = Record<string, unknown>;

/** JSON with sorted keys, so two copies of the same data always compare equal. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
      : v,
  );
}

/** Whichever side, chosen the same way however they're ordered. */
const either = <T>(a: T, b: T): T => (stable(a) >= stable(b) ? a : b);

/** One side if only one has it, and a merge if both do. */
function combine<T>(a: T | undefined, b: T | undefined, merge: (a: T, b: T) => T): T | undefined {
  if (a === undefined) return b;
  return b === undefined ? a : merge(a, b);
}

const higher = (a: number | undefined, b: number | undefined) => combine(a, b, Math.max);
const lower = (a: number | undefined, b: number | undefined) => combine(a, b, Math.min);
const union = (a: string[] | undefined, b: string[] | undefined) =>
  combine(a, b, (x, y) => [...new Set([...x, ...y])].sort());

/** Drops missing fields, so merging doesn't add `undefined` keys a save never had. */
const present = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

/**
 * The fields a rule doesn't know about, kept from both sides, so an older client
 * can't delete newer data. Rules then write their own fields over these.
 */
function unknownFields(a: object, b: object): Loose {
  const x = a as Loose;
  const y = b as Loose;
  const out: Loose = {};
  for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
    out[key] = combine(x[key], y[key], either);
  }
  return out;
}

function mergeRecord<T>(
  a: Record<string, T> | undefined,
  b: Record<string, T> | undefined,
  merge: (a: T, b: T) => T,
): Record<string, T> | undefined {
  return combine(a, b, (x, y) => {
    const out: Record<string, T> = {};
    for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
      out[key] = combine(x[key], y[key], merge)!;
    }
    return out;
  });
}

const mergeStats = (a: PuzzleStats, b: PuzzleStats): PuzzleStats => ({
  ...unknownFields(a, b),
  solves: Math.max(a.solves, b.solves),
  bestTime: Math.min(a.bestTime, b.bestTime),
});

const laterBoard = (a: SavedBoard, b: SavedBoard): SavedBoard => {
  const [x, y] = [a.elapsed ?? 0, b.elapsed ?? 0];
  return x === y ? either(a, b) : x > y ? a : b;
};

function mergeBoards(a: SaveData, b: SaveData): Record<string, SavedBoard> {
  const out: Record<string, SavedBoard> = {};
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
  totalTime: Math.max(a.totalTime ?? 0, b.totalTime ?? 0),
});

/** An older save's best HP may be from a Relaxed run, so a Hits-on side's best beats it. */
function mergeBestHp(a: JobStats, b: JobStats): number | undefined {
  const trusted = [a, b].filter((job) => job.hitsOnWins);
  return (trusted.length ? trusted : [a, b])
    .map((job) => job.bestHp)
    .reduce((x, y) => higher(x, y));
}

const mergeJob = (a: JobStats, b: JobStats): JobStats =>
  present({
    ...unknownFields(a, b),
    plays: Math.max(a.plays, b.plays),
    wins: Math.max(a.wins, b.wins),
    hitsOnWins: higher(a.hitsOnWins, b.hitsOnWins),
    bestHp: mergeBestHp(a, b),
    bestDepth: higher(a.bestDepth, b.bestDepth),
  });

function mergeRun(a: RunSave, b: RunSave): RunSave {
  const [atA, atB] = [a.currentUpdatedAt ?? 0, b.currentUpdatedAt ?? 0];
  // The run is taken whole: two half-runs blended together would be neither.
  const newer = atA === atB ? either(a, b) : atA > atB ? a : b;
  return present({
    ...unknownFields(a, b),
    current: newer.current,
    currentUpdatedAt: newer.currentUpdatedAt,
    seenScenes: union(a.seenScenes, b.seenScenes) ?? [],
    seenTips: union(a.seenTips, b.seenTips),
    jobs: mergeRecord(a.jobs, b.jobs, mergeJob) ?? {},
  });
}

type DailyBoard = NonNullable<DailySave['board']>;

function mergeDailyBoard(a: DailyBoard, b: DailyBoard): DailyBoard {
  if (a.day !== b.day) return dayNumber(a.day) > dayNumber(b.day) ? a : b;
  const saved = laterBoard(a.saved, b.saved);
  return saved === a.saved ? a : b;
}

function mergeDaily(a: DailySave, b: DailySave): DailySave {
  const dayOf = (save: DailySave) => (save.lastSolved ? dayNumber(save.lastSolved) : -Infinity);
  const [dayA, dayB] = [dayOf(a), dayOf(b)];
  const latest = dayA === dayB ? (a.streak >= b.streak ? a : b) : dayA > dayB ? a : b;
  const board = combine(a.board, b.board, mergeDailyBoard);
  return present({
    ...unknownFields(a, b),
    lastSolved: latest.lastSolved,
    streak: latest.streak,
    best: Math.max(a.best, b.best),
    solves: Math.max(a.solves, b.solves),
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

const mergeBadges = (a: BadgeSave, b: BadgeSave): BadgeSave => ({
  ...(unknownFields(a, b) as object),
  earned: mergeRecord(a.earned, b.earned, mergeEarned) ?? {},
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
