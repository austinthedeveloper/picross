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

export const getPuzzle = (id: string) => byId.get(id);

/** The puzzle after this one in the list, if any. */
export function nextPuzzle(id: string): Puzzle | undefined {
  const i = PUZZLES.findIndex((p) => p.id === id);
  return i >= 0 ? PUZZLES[i + 1] : undefined;
}
