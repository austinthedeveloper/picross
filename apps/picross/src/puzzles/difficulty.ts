import ratings from './ratings.json';

/**
 * How hard a free-play puzzle is (#112), rated from how many passes a line solver
 * needs on its plain clues. Passes only approximate how hard a puzzle feels, so
 * these cutoffs came from the pack's spread and may move after playtesting.
 * For scale, the Curator takes 12 with every power applied.
 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'insane';

/** Lowest first. Each band starts at `passes`. */
export const DIFFICULTIES: { id: Difficulty; label: string; passes: number }[] = [
  { id: 'easy', label: 'Easy', passes: 0 },
  { id: 'medium', label: 'Medium', passes: 3 },
  { id: 'hard', label: 'Hard', passes: 5 },
  { id: 'expert', label: 'Expert', passes: 8 },
  { id: 'insane', label: 'Insane', passes: 11 },
];

export function difficultyOf(passes: number) {
  return DIFFICULTIES.filter((band) => band.passes <= passes).at(-1)!;
}

const passesById = ratings as Record<string, number>;

/**
 * A pack puzzle's solver passes. Saved in `ratings.json` by `npm run rate:puzzles`,
 * because working them out for the whole pack is too slow to do when the list opens.
 * A test keeps the file in step with the puzzles.
 */
export const puzzlePasses = (id: string): number => passesById[id] ?? 0;

export const puzzleDifficulty = (id: string) => difficultyOf(puzzlePasses(id));
