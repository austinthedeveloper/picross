import { decodeJson, encodeJson } from '@picross/shared/game/share';
import { parsePuzzle, type Puzzle, type PuzzleFile } from '@picross/grid/puzzles/format';

/**
 * A Flat puzzle's share code (#159): its puzzle file in the URL (`@picross/shared/game/share`),
 * the Flat half of share links (`#/p/flat/<code>`). It's the app's, not `@picross/grid`'s,
 * which has no DOM.
 */
export async function encodeShare(file: PuzzleFile): Promise<string> {
  const { id, name, width, height, solution } = file;
  return encodeJson({ id, name, width, height, solution });
}

/** Reads a share code back into a checked puzzle. Throws if it's broken or invalid. */
export async function decodeShare(code: string): Promise<Puzzle> {
  const file = (await decodeJson(code)) as PuzzleFile;
  // Shared puzzles get their own id space, so they never collide with the pack's saves.
  return parsePuzzle({ ...file, id: `shared-${String(file.id).slice(0, 40)}` });
}
