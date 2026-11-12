import { decodeJson, encodeJson } from '@picross/shared/game/share';
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';

/**
 * A block's share code: its puzzle file in the URL (`@picross/shared/game/share`), the
 * Cubed half of share links (`#/p/cubed/<code>`, and the old `#/cubed/p/<code>`).
 */
export async function encodeShare(file: PuzzleFile): Promise<string> {
  const { id, name, colors, layers, hide } = file;
  return encodeJson({ id, name, colors, layers, hide });
}

/** Reads a share code back into a checked puzzle. Throws if it's broken or invalid. */
export async function decodeShare(code: string): Promise<Puzzle> {
  const file = (await decodeJson(code)) as PuzzleFile;
  // Shared puzzles get their own id space, so they never collide with the pack's saves.
  return parsePuzzle({ ...file, id: `shared-${String(file.id).slice(0, 40)}` });
}
