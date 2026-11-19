/**
 * Brick kids' own models (docs/brick-kids.md): small, chunky toys made for building, not
 * nonograms, so they have no hidden clues and no place in free play or the daily. Their
 * ids are their own: none is a pack, story or trio id (`build/models.test.ts`).
 */
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';

const files = import.meta.glob<PuzzleFile>('./bricks/*.json', { eager: true, import: 'default' });

export const BRICKS_PUZZLES: Puzzle[] = Object.values(files).map(parsePuzzle);
const byId = new Map(BRICKS_PUZZLES.map((p) => [p.id, p]));

/** One of Brick kids' models. */
export const getBricksPuzzle = (id: string) => byId.get(id);
