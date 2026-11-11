import { dayNumber, previousDay } from '@picross/shared/puzzles/days';
import { dailyPick } from './dailyCycle';
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';
import { PUZZLES } from './index';
import { turnPuzzle, type Turn } from './transform';

const files = import.meta.glob<PuzzleFile>('./pack/*.json', { eager: true, import: 'default' });
const fileById = new Map(Object.values(files).map((f) => [f.id, f]));

/** A local date as YYYY-MM-DD: the daily puzzle changes at your midnight. */
export { dateKey } from '@picross/shared/puzzles/days';

/** The day before a date key. */
export const dayBefore = previousDay;

/** Pack puzzles big enough to be a daily (4 or more on the longest side). */
export const POOL = PUZZLES.filter((p) => Math.max(p.dims.x, p.dims.y, p.dims.z) >= 4);

/**
 * The daily puzzle for a date: a pack puzzle turned or mirrored so it isn't the one you
 * remember. Same date, same puzzle, for everyone. Since #156 it's played on even days (the
 * one daily alternates, `dailyDimension`), and Cubed's days run through every pool puzzle
 * in every turn before one repeats (`dailyCycle.ts`). An odd day gets the day before's.
 */
export function dailyPuzzle(key: string): { puzzle: Puzzle; source: Puzzle; turn: Turn } {
  const pick = dailyPick(Math.floor(dayNumber(key) / 2), POOL.length);
  const source = POOL[pick.source];
  const file = turnPuzzle(fileById.get(source.id)!, source, pick.turn);
  const puzzle = parsePuzzle({ ...file, id: `daily-${key}` });
  return { puzzle: { ...puzzle, passes: source.passes }, source, turn: pick.turn };
}
