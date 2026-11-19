/**
 * The trio's 3D models: draw it (the 2D puzzle), carve it (this one), build it (bricks). A
 * trio puzzle lives in `trio/`, out of free play and the daily (a new pack puzzle reshuffles
 * the daily's whole cycle), with a 2D picture of the same id in `@picross/grid`'s `trio/`.
 *
 * Any other block can be built too: `buildModel` falls back to Brick kids' own models
 * (`bricks/`), the pack and the story's.
 */
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';
import { getBricksPuzzle } from './bricks';
import { getPuzzle, getStoryPuzzle } from './index';

const files = import.meta.glob<PuzzleFile>('./trio/*.json', { eager: true, import: 'default' });

export const TRIO_PUZZLES: Puzzle[] = Object.values(files).map(parsePuzzle);
const byId = new Map(TRIO_PUZZLES.map((p) => [p.id, p]));

/** The trio's 3D puzzle with this id. */
export const getTrioPuzzle = (id: string) => byId.get(id);

/** The solved model to build: a trio puzzle, Brick kids' own, free play's, then the story's. */
export const buildModel = (id: string): Puzzle | undefined =>
  byId.get(id) ?? getBricksPuzzle(id) ?? getPuzzle(id) ?? getStoryPuzzle(id);
