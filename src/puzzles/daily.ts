import { hashString } from './hide';
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';
import { PUZZLES } from './index';
import { turnPuzzle, type Turn } from './transform';

const files = import.meta.glob<PuzzleFile>('./pack/*.json', { eager: true, import: 'default' });
const fileById = new Map(Object.values(files).map((f) => [f.id, f]));

/** A local date as YYYY-MM-DD: the daily puzzle changes at your midnight. */
export function dateKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day before a date key. */
export function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

/** Pack puzzles big enough to be a daily (4 or more on the longest side). */
const POOL = PUZZLES.filter((p) => Math.max(p.dims.x, p.dims.y, p.dims.z) >= 4);

/**
 * The daily puzzle for a date: a pack puzzle picked by the date, turned or mirrored so it
 * isn't the one you remember. Same date, same puzzle, for everyone.
 */
export function dailyPuzzle(key: string): { puzzle: Puzzle; source: Puzzle; turn: Turn } {
  const source = POOL[hashString(`daily:${key}`) % POOL.length];
  const h = hashString(`turn:${key}`);
  const turn: Turn = { quarters: (h % 4) as Turn['quarters'], mirror: Boolean((h >> 2) & 1) };
  const file = turnPuzzle(fileById.get(source.id)!, source, turn);
  const puzzle = parsePuzzle({ ...file, id: `daily-${key}` });
  return { puzzle: { ...puzzle, passes: source.passes }, source, turn };
}
