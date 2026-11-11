import { dayBefore } from '../puzzles/daily';
import type { SavedBoard } from './progress';
import { readStore, writeStore } from '@picross/shared/game/storage';

const KEY = 'picross3d:daily';

export interface DailySave {
  /** Days in a row solved, as of `last`. */
  streak: number;
  best: number;
  /** The date key of the last daily solved. */
  last?: string;
  /** Today's board in progress, if any. */
  board?: SavedBoard & { date: string };
  /** Best time per date solved. */
  times: Record<string, number>;
}

const data = readStore<DailySave>(KEY, { streak: 0, best: 0, times: {} });
const persist = () => writeStore(KEY, data);

/** The streak as it stands today: it's broken once a day goes by unsolved. */
export function currentStreak(today: string): number {
  return data.last === today || data.last === dayBefore(today) ? data.streak : 0;
}

export const bestStreak = () => data.best;
export const solvedOn = (date: string) => data.times[date];

/** Records today's solve. Returns the streak after it. */
export function recordDaily(today: string, time: number): number {
  if (data.last !== today) {
    data.streak = data.last === dayBefore(today) ? data.streak + 1 : 1;
    data.last = today;
  }
  data.best = Math.max(data.best, data.streak);
  data.times[today] = Math.min(data.times[today] ?? Infinity, time);
  delete data.board;
  persist();
  return data.streak;
}

export const getDailyBoard = (date: string) => (data.board?.date === date ? data.board : undefined);

export function clearDailyBoard(): void {
  delete data.board;
  persist();
}

export function saveDailyBoard(date: string, board: SavedBoard): void {
  data.board = { ...board, date };
  persist();
}
