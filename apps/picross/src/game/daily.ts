import type { BlockSavedBoard, SavedBoard } from './progress';
import { previousDay } from '@picross/shared/puzzles/days';
import type { Dimension } from '@picross/shared/puzzles/ids';
import { readStore, writeStore } from '@picross/shared/game/storage';

/**
 * The one daily (#156): one puzzle a day, on Flat or Cubed by turns (`dailyDimension`), and
 * one streak over both. Before it each game had its own (`picross:daily`, `picross3d:daily`),
 * which the migration (`migrate.ts`, step 2) merged into this key and left as they were.
 */
export const DAILY_KEY = 'picross:daily2';

/** A day's daily solved: on which board, and how long it took (missing from older saves). */
export interface DaySolved {
  dimension: Dimension;
  time?: number;
}

/** A daily board in progress: today's, on today's board. */
export interface DailyBoard {
  day: string;
  dimension: Dimension;
  saved: SavedBoard | BlockSavedBoard;
}

export interface DailySave {
  /** Every day solved. The 2D game kept no list, so its days before the merge are its last streak's. */
  days: Record<string, DaySolved>;
  /** Day key of the last daily solved. */
  lastSolved?: string;
  /** Days in a row solved, ending at `lastSolved`. */
  streak: number;
  best: number;
  /** Every daily solved, on either board (at least as many as `days`). */
  solves: number;
  /** Today's board in progress, with the day and board it belongs to. */
  board?: DailyBoard;
}

const data = readStore<DailySave>(DAILY_KEY, { days: {}, streak: 0, best: 0, solves: 0 });
data.days ??= {};
const persist = () => writeStore(DAILY_KEY, data);

export const isDailySolved = (day: string): boolean => Boolean(data.days[day]);

/** The day's solve, if it's been solved. */
export const solvedOn = (day: string): DaySolved | undefined => data.days[day];

/** Whether the streak is still going on `today`: the last solve was today or yesterday. */
const alive = (today: string) =>
  data.lastSolved === today || data.lastSolved === previousDay(today);

/**
 * The streak as of `today`: it still counts if you solved yesterday's and haven't done
 * today's yet, and it's 0 once you've missed a day.
 */
export function dailyStreak(today: string) {
  return { streak: alive(today) ? data.streak : 0, best: data.best, solves: data.solves };
}

/** Every daily ever solved. Each one counts toward your rank (#106). */
export const dailySolves = () => data.solves;

/** The longest streak ever. A broken streak doesn't lower it, so badges use this (#111). */
export const bestDailyStreak = () => data.best;

/**
 * Records today's solve, on `dimension`'s board, in `time` ms. Solving again keeps the best
 * time. Returns the streak after it.
 */
export function recordDailySolve(today: string, dimension: Dimension, time?: number): number {
  const before = data.days[today];
  if (!before) {
    data.streak = data.lastSolved === previousDay(today) ? data.streak + 1 : 1;
    data.best = Math.max(data.best, data.streak);
    data.solves += 1;
    data.lastSolved = today;
  }
  const times = [before?.time, time].filter((t) => t !== undefined);
  data.days[today] = {
    dimension: before?.dimension ?? dimension,
    ...(times.length ? { time: Math.min(...times) } : {}),
  };
  delete data.board;
  persist();
  return data.streak;
}

/** Today's saved board, if it's from today and on this board. */
export function getDailyBoard<D extends Dimension>(
  day: string,
  dimension: D,
): (D extends 'block' ? BlockSavedBoard : SavedBoard) | undefined {
  const board = data.board;
  return board?.day === day && board.dimension === dimension
    ? (board.saved as D extends 'block' ? BlockSavedBoard : SavedBoard)
    : undefined;
}

export function saveDailyBoard(
  day: string,
  dimension: Dimension,
  saved: SavedBoard | BlockSavedBoard | null,
): void {
  if (saved) data.board = { day, dimension, saved };
  else delete data.board;
  persist();
}
