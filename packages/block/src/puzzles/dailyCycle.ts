import { shuffled } from '@picross/shared/engine/random';
import type { Turn } from './transform';

/**
 * Which pack puzzle and turn the nth Cubed daily is (#156). Pure arithmetic on the pool's
 * size, with no pack, so the browser tests can work out a day's block from the files.
 *
 * Cubed's dailies come every other day (Flat has the rest), and go through every pool
 * puzzle in all eight turns before any comes back: a cycle of `poolSize × 8` Cubed days,
 * the same one over and over, so no puzzle and turn repeats within any stretch that long.
 * The cycle is eight rounds, each the whole pool in a fixed shuffle, so a puzzle comes back
 * only in the next round, in a turn it hasn't had yet, and never on the next Cubed day.
 */

/** The eight ways to set a block down: four quarter turns, each mirrored or not. */
export const TURNS: readonly Turn[] = ([0, 1, 2, 3] as const).flatMap((quarters) => [
  { quarters, mirror: false },
  { quarters, mirror: true },
]);

/** Fixes the order. Changing it reshuffles every Cubed day. */
const SEED = 20261112;

/** A round of the cycle: the pool's indexes in its shuffle. */
const rawRound = (size: number, round: number) =>
  shuffled(
    Array.from({ length: size }, (_, i) => i),
    SEED + round,
  );

/** A round, with its first puzzle moved along if the round before (or the cycle's last) ended on it. */
function roundOrder(size: number, round: number): number[] {
  const order = rawRound(size, round);
  const before = rawRound(size, (round + TURNS.length - 1) % TURNS.length);
  // Only a round's first two ever move, so the round before's last is where it was.
  if (size > 2 && order[0] === before[size - 1]) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/** The order of a puzzle's eight turns, one a round. */
const turnOrder = (source: number) =>
  shuffled(
    TURNS.map((_, i) => i),
    (SEED ^ 0x5bd1e995) + source,
  );

/**
 * The `index`th Cubed daily (`Math.floor(dayNumber / 2)`): which pool puzzle it is, and how
 * it's turned. `poolSize` is how many puzzles can be a daily.
 */
export function dailyPick(index: number, poolSize: number): { source: number; turn: Turn } {
  const length = poolSize * TURNS.length;
  const at = ((index % length) + length) % length;
  const round = Math.floor(at / poolSize);
  const source = roundOrder(poolSize, round)[at % poolSize];
  return { source, turn: TURNS[turnOrder(source)[round]] };
}

/** How many Cubed dailies go by before one repeats. */
export const cycleLength = (poolSize: number) => poolSize * TURNS.length;
