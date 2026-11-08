import { solve, UNKNOWN } from '../engine/solver';
import { encodeHidden, parsePuzzle, type PuzzleFile } from './format';
import { chooseHidden } from './hide';

export type CheckResult =
  | { ok: true; hide: string; passes: number; shown: number; lines: number }
  | { ok: false; error: string; unknown: number[] };

/**
 * Everything the editor needs to know about a shape: whether line logic can solve it with
 * every clue shown (and if not, which cubes it can't work out), and if so, which clues to
 * hide at `ratio` and how many passes that takes. Runs in a worker in the editor.
 */
export function checkPuzzle(file: PuzzleFile, ratio: number): CheckResult {
  let puzzle;
  try {
    puzzle = parsePuzzle({ ...file, hide: undefined });
  } catch (e) {
    return { ok: false, error: (e as Error).message.replace(/^Puzzle [^:]*: /, ''), unknown: [] };
  }
  const full = solve(puzzle.dims, puzzle.allClues, undefined, puzzle.lines);
  if (!full.solved) {
    const unknown = [...full.known.keys()].filter((i) => full.known[i] === UNKNOWN);
    return {
      ok: false,
      error: `Line logic can’t work out ${unknown.length} cubes, even with every clue shown.`,
      unknown,
    };
  }
  const hidden = chooseHidden(puzzle, ratio)!;
  const hide = encodeHidden(hidden);
  const result = solve(
    puzzle.dims,
    puzzle.allClues.map((c, i) => (hidden[i] ? null : c)),
    undefined,
    puzzle.lines,
  );
  return {
    ok: true,
    hide,
    passes: result.passes,
    shown: hidden.filter((h) => !h).length,
    lines: hidden.length,
  };
}
