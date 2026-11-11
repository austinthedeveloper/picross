import type { SavedBoard } from './progress';
import {
  bestDailyStreak,
  dailyStreak,
  getDailyBoard as boardFor,
  recordDailySolve,
  saveDailyBoard as saveBoard,
  solvedOn as solved,
} from '../../game/daily';

/**
 * Cubed's daily: a view of the one daily (`game/daily.ts`, #156) on the `block` board. One
 * streak counts both boards' days. Before #156 it had its own key, `picross3d:daily`.
 */

/** The streak as it stands today: it's broken once a day goes by unsolved. */
export const currentStreak = (today: string): number => dailyStreak(today).streak;

export const bestStreak = bestDailyStreak;

/** A day's daily, if it's been solved: its board and best time (if it kept one). */
export const solvedOn = solved;

/** Records today's solve. Returns the streak after it. */
export const recordDaily = (today: string, time: number): number =>
  recordDailySolve(today, 'block', time);

export const getDailyBoard = (date: string): SavedBoard | undefined => boardFor(date, 'block');

export const clearDailyBoard = (date: string): void => saveBoard(date, 'block', null);

export const saveDailyBoard = (date: string, board: SavedBoard): void =>
  saveBoard(date, 'block', board);
