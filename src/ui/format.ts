/** Formats milliseconds as m:ss, or h:mm:ss past an hour. */
import type { Line } from '../engine/lines';

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "1 hint", "3 hints". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "row 3" / "column 12" (1-based), or "Row 3" with `capital`. */
export function lineName({ kind, index }: Line, capital = false): string {
  const word = kind === 'row' ? 'row' : 'column';
  return `${capital ? word[0].toUpperCase() + word.slice(1) : word} ${index + 1}`;
}
