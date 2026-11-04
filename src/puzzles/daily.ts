import { deriveClues } from '../engine/clues';
import { shuffled } from '../engine/random';
import { TRANSFORMS, transformGrid } from '../engine/transform';
import type { Puzzle } from './format';
import { packInOrder } from './index';

/** Daily puzzles (#69) are 15×15 or bigger. */
const MIN_SIZE = 15;
/** Fixes the order of the daily cycle. Changing it reshuffles every day. */
const SEED = 20261103;

/** A local calendar date as "YYYY-MM-DD". */
export function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days since 1970-01-01 for a "YYYY-MM-DD" key (time zone free). */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The key for the day before. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

export interface Daily {
  key: string;
  /** Today's board: a pack puzzle, maybe turned or flipped. */
  puzzle: Puzzle;
  /** The pack puzzle it came from, and how it was turned (named after it's solved). */
  base: Puzzle;
  transform: string;
}

/**
 * The puzzle for a day: every big pack puzzle in all eight turns and flips,
 * shuffled into a fixed cycle, so everyone gets the same one on the same date
 * and nothing repeats until the cycle runs out.
 */
export function dailyFor(key: string, pool: readonly Puzzle[] = bigPuzzles()): Daily {
  const pairs = pool.flatMap((p) => TRANSFORMS.map((_, t) => [p, t] as const));
  const day = dayNumber(key);
  const cycle = Math.floor(day / pairs.length);
  const [base, t] = shuffled(pairs, SEED + cycle)[day - cycle * pairs.length];
  const solution = transformGrid(base.solution, t);
  return {
    key,
    base,
    transform: TRANSFORMS[t],
    puzzle: {
      id: `daily-${key}`,
      name: 'Daily puzzle',
      width: solution.width,
      height: solution.height,
      solution,
      clues: deriveClues(solution),
    },
  };
}

export const bigPuzzles = () =>
  packInOrder.filter((p) => p.width >= MIN_SIZE && p.height >= MIN_SIZE);
