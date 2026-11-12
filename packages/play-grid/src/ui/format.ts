import type { Line } from '@picross/grid/engine/lines';

/** "row 3" / "column 12" (1-based), or "Row 3" with `capital`. */
export function lineName({ kind, index }: Line, capital = false): string {
  const word = kind === 'row' ? 'row' : 'column';
  return `${capital ? word[0].toUpperCase() + word.slice(1) : word} ${index + 1}`;
}
