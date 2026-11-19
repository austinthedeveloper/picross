/**
 * What a build needs of a model, and where the models come from. A model is any solved
 * block: the trio's (`puzzles/trio/`), Brick kids' own (`puzzles/bricks/`), free play's
 * pack, or the story's. Their ids never clash (`models.test.ts`), so one id finds one model.
 */
import { getBricksPuzzle } from '../puzzles/bricks';
import type { Puzzle } from '../puzzles/format';
import { getPuzzle, getStoryPuzzle } from '../puzzles/index';
import { getTrioPuzzle } from '../puzzles/trio';

/**
 * What the build and its view read of a model. Every `Puzzle` is one; the build never needs
 * its clues.
 */
export type BrickModel = Pick<Puzzle, 'id' | 'name' | 'dims' | 'solution' | 'palette'>;

/** The solved block to build: the trio's, Brick kids' own, free play's, then the story's. */
export const buildModel = (id: string): Puzzle | undefined =>
  getTrioPuzzle(id) ?? getBricksPuzzle(id) ?? getPuzzle(id) ?? getStoryPuzzle(id);
