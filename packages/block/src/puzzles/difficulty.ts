import type { Puzzle } from './format';

/**
 * Difficulty bands, from how many sweeps the line solver needs (`passes`, written by
 * `npm run puzzles`), nudged up a band for big blocks, where every sweep is more work.
 * The nudge stops at Expert: Insane is by passes alone, at any size.
 *
 * | Band   | Passes (blocks up to 8 per side) |
 * | ------ | -------------------------------- |
 * | Easy   | up to 3                          |
 * | Medium | 4–5                              |
 * | Hard   | 6–8                              |
 * | Expert | 9–12                             |
 * | Insane | 13 and up, at any size           |
 *
 * Insane came with the first insane pairs (Flat and Cubed puzzles of one subject): the same
 * five bands as Flat's (`@picross/grid/puzzles/difficulty`), so the two line up.
 */
export const BANDS = [
  { id: 'easy', label: 'Easy', maxPasses: 3 },
  { id: 'medium', label: 'Medium', maxPasses: 5 },
  { id: 'hard', label: 'Hard', maxPasses: 8 },
  { id: 'expert', label: 'Expert', maxPasses: 12 },
  { id: 'insane', label: 'Insane', maxPasses: Infinity },
] as const;

const EXPERT = BANDS.findIndex((b) => b.id === 'expert');

export type Band = (typeof BANDS)[number];

export function difficultyOf(puzzle: Pick<Puzzle, 'passes' | 'dims'>): Band {
  const i = BANDS.findIndex((b) => puzzle.passes <= b.maxPasses);
  const longest = Math.max(puzzle.dims.x, puzzle.dims.y, puzzle.dims.z);
  if (BANDS[i].id === 'insane') return BANDS[i];
  return BANDS[Math.min(EXPERT, i + (longest >= 9 ? 1 : 0))];
}
