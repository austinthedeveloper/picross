import { deriveClues } from '@picross/grid/engine/clues';
import { shuffled } from '@picross/shared/engine/random';
import { TRANSFORMS, transformGrid } from '@picross/grid/engine/transform';
import type { Puzzle } from '@picross/grid/puzzles/format';
import { packInOrder } from '@picross/grid/puzzles/index';
import { dayNumber } from '@picross/shared/puzzles/days';
import { isInsanePair } from '@picross/shared/puzzles/pairs';

/** Daily puzzles (#69) are 15×15 or bigger. */
const MIN_SIZE = 15;
/** Fixes the order of the daily cycle. Changing it reshuffles every day. */
const SEED = 20261103;

// Day keys are both games' (#156): the one daily alternates boards, Flat on odd days.
export { dailyDimension, dateKey, dayNumber, previousDay } from '@picross/shared/puzzles/days';

export interface Daily {
  key: string;
  /** Today's board: a pack puzzle, maybe turned or flipped. */
  puzzle: Puzzle;
  /** The pack puzzle it came from, and how it was turned (named after it's solved). */
  base: Puzzle;
  transform: string;
}

/** A Flat day's pack puzzle and turn, without building its board. */
export interface DailyPick {
  base: Puzzle;
  /** An index into TRANSFORMS. */
  turn: number;
}

/**
 * Every Flat day's pick in the cycle a day is in: each big pack puzzle in all eight turns and
 * flips, in a fixed shuffle. Kept for the last cycle asked for, since a cycle is 1704 days.
 */
let lastCycle: { pool: readonly Puzzle[]; cycle: number; picks: DailyPick[] } | undefined;

function cyclePicks(pool: readonly Puzzle[], cycle: number): DailyPick[] {
  if (lastCycle?.pool === pool && lastCycle.cycle === cycle) return lastCycle.picks;
  const pairs = pool.flatMap((base) => TRANSFORMS.map((_, turn) => ({ base, turn })));
  const picks = shuffled(pairs, SEED + cycle);
  lastCycle = { pool, cycle, picks };
  return picks;
}

/** Which pack puzzle and turn a day's daily is, on the Flat board's mapping. */
export function dailyPick(key: string, pool: readonly Puzzle[] = BIG): DailyPick {
  const length = pool.length * TRANSFORMS.length;
  const day = dayNumber(key);
  const cycle = Math.floor(day / length);
  return cyclePicks(pool, cycle)[day - cycle * length];
}

/**
 * The puzzle for a day: every big pack puzzle in all eight turns and flips,
 * shuffled into a fixed cycle, so everyone gets the same one on the same date
 * and nothing repeats until the cycle runs out.
 *
 * Since #156 only Flat days (`dailyDimension`) play it, and they play exactly what they
 * did before: the cycle still runs by calendar day, Cubed's days just skip their turn.
 */
export function dailyFor(key: string, pool: readonly Puzzle[] = BIG): Daily {
  const { base, turn } = dailyPick(key, pool);
  const solution = transformGrid(base.solution, turn);
  return {
    key,
    base,
    transform: TRANSFORMS[turn],
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
  // The insane pairs are free play's: a new puzzle in the pool would reshuffle every day.
  packInOrder.filter((p) => p.width >= MIN_SIZE && p.height >= MIN_SIZE && !isInsanePair(p.id));

/** The pool, worked out once. */
const BIG = bigPuzzles();
