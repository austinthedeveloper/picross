import { volume } from '../engine/volume';
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';

const files = import.meta.glob<PuzzleFile>('./pack/*.json', { eager: true, import: 'default' });

const longest = (p: Puzzle) => Math.max(p.dims.x, p.dims.y, p.dims.z);

/** Every free-play puzzle: by the block's longest side, then its size, difficulty and name. */
export const PUZZLES: Puzzle[] = Object.values(files)
  .map(parsePuzzle)
  .sort(
    (a, b) =>
      longest(a) - longest(b) ||
      volume(a.dims) - volume(b.dims) ||
      a.passes - b.passes ||
      a.name.localeCompare(b.name),
  );

const byId = new Map(PUZZLES.map((p) => [p.id, p]));

const storyFiles = import.meta.glob<PuzzleFile>('./story/*.json', {
  eager: true,
  import: 'default',
});

/**
 * Story puzzles: one per 2D puzzle a story encounter uses, with the same id, so the
 * imported story finds its 3D puzzle by the 2D one's id. Not in the free-play list.
 */
export const STORY_PUZZLES: Puzzle[] = Object.values(storyFiles).map(parsePuzzle);
const storyById = new Map(STORY_PUZZLES.map((p) => [p.id, p]));

/** The 3D puzzle for a story encounter's (2D) puzzle id. */
export const getStoryPuzzle = (id: string) => storyById.get(id);

export const getPuzzle = (id: string) => byId.get(id);

/** The puzzle after this one in the list, if any. */
export function nextPuzzle(id: string): Puzzle | undefined {
  const i = PUZZLES.findIndex((p) => p.id === id);
  return i >= 0 ? PUZZLES[i + 1] : undefined;
}
