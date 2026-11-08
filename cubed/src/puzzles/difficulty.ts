import type { Puzzle } from './format';

/**
 * Difficulty bands, from how many sweeps the line solver needs (`passes`, written by
 * `npm run puzzles`), nudged up a band for big blocks, where every sweep is more work.
 *
 * | Band   | Passes (blocks up to 8 per side) |
 * | ------ | -------------------------------- |
 * | Easy   | up to 3                          |
 * | Medium | 4–5                              |
 * | Hard   | 6–8                              |
 * | Expert | 9 and up                         |
 */
export const BANDS = [
  { id: 'easy', label: 'Easy', maxPasses: 3 },
  { id: 'medium', label: 'Medium', maxPasses: 5 },
  { id: 'hard', label: 'Hard', maxPasses: 8 },
  { id: 'expert', label: 'Expert', maxPasses: Infinity },
] as const;

export type Band = (typeof BANDS)[number];

export function difficultyOf(puzzle: Pick<Puzzle, 'passes' | 'dims'>): Band {
  const i = BANDS.findIndex((b) => puzzle.passes <= b.maxPasses);
  const longest = Math.max(puzzle.dims.x, puzzle.dims.y, puzzle.dims.z);
  return BANDS[Math.min(BANDS.length - 1, i + (longest >= 9 ? 1 : 0))];
}
