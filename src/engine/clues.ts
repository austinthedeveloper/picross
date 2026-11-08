/**
 * Clues. Each line's clue counts the cubes of the shape in it, and its frame says how many
 * pieces they're in: a plain number for one piece (or none), a circle for two, a square
 * for three or more.
 */
export interface Clue {
  count: number;
  /** 0 or 1 piece shows plain, 2 a circle, and 3 means three or more (a square). */
  pieces: 0 | 1 | 2 | 3;
}

export type ClueFrame = 'plain' | 'circle' | 'square';

export const clueFrame = (clue: Clue): ClueFrame =>
  clue.pieces >= 3 ? 'square' : clue.pieces === 2 ? 'circle' : 'plain';

/** The clue for a line of filled (true) and empty (false) cubes. */
export function clueOf(filled: readonly boolean[]): Clue {
  let count = 0;
  let pieces = 0;
  filled.forEach((f, i) => {
    if (!f) return;
    count++;
    if (i === 0 || !filled[i - 1]) pieces++;
  });
  return { count, pieces: Math.min(pieces, 3) as Clue['pieces'] };
}

/** The clue for a line given as a bit mask of its filled cubes (bit t = cube t). */
export function clueOfMask(mask: number, length: number): Clue {
  const filled: boolean[] = [];
  for (let t = 0; t < length; t++) filled.push(((mask >> t) & 1) === 1);
  return clueOf(filled);
}

/** Read aloud: "3", "3 in 2 pieces", "5 in 3 or more pieces". */
export function clueText(clue: Clue): string {
  if (clue.pieces <= 1) return String(clue.count);
  return `${clue.count} in ${clue.pieces === 2 ? '2' : '3 or more'} pieces`;
}
