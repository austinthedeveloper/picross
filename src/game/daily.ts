import type { SavedBoard } from './progress';
import { readStore, writeStore } from './storage';

const KEY = 'picross:daily';

/** Daily puzzle progress (#69): the streak, and today's board in progress. */
interface DailySave {
  /** Day key of the last daily solved. */
  lastSolved?: string;
  /** Days in a row solved, ending at `lastSolved`. */
  streak: number;
  best: number;
  /** Every daily solved. */
  solves: number;
  /** Today's board in progress, with the day it belongs to. */
  board?: { day: string; saved: SavedBoard };
}

const data = readStore<DailySave>(KEY, { streak: 0, best: 0, solves: 0 });
const persist = () => writeStore(KEY, data);

export function isDailySolved(day: string): boolean {
  return data.lastSolved === day;
}

/**
 * The streak as of `today`: it still counts if you solved yesterday's and
 * haven't done today's yet, and it's 0 once you've missed a day.
 */
export function dailyStreak(today: string, yesterday: string) {
  const alive = data.lastSolved === today || data.lastSolved === yesterday;
  return { streak: alive ? data.streak : 0, best: data.best, solves: data.solves };
}

/** Every daily ever solved. Each one counts toward your rank (#106). */
export const dailySolves = () => data.solves;

/** The longest streak ever. A broken streak doesn't lower it, so badges use this (#111). */
export const bestDailyStreak = () => data.best;

/** Records today's solve. Returns the streak after it. */
export function recordDailySolve(today: string, yesterday: string): number {
  if (data.lastSolved !== today) {
    data.streak = data.lastSolved === yesterday ? data.streak + 1 : 1;
    data.best = Math.max(data.best, data.streak);
    data.solves += 1;
    data.lastSolved = today;
  }
  delete data.board;
  persist();
  return data.streak;
}

/** Today's saved board, if it's from today. */
export function getDailyBoard(day: string): SavedBoard | undefined {
  return data.board?.day === day ? data.board.saved : undefined;
}

export function saveDailyBoard(day: string, saved: SavedBoard | null): void {
  if (saved) data.board = { day, saved };
  else delete data.board;
  persist();
}
