import { Cell, column, row, type Board, type Solution } from './board';
import { hasLine, lineKey, type Line, type LineKind, type LineSet } from './lines';

/**
 * Picks the line a charging enemy goes live on (#67): the unfinished line you're
 * furthest through, so there's always a fair race to win. On an empty board that's
 * the line with the most cells to fill, which is usually the easiest to start.
 * Blank lines, lines already `finished`, and lines in `avoid` (clues you can't read
 * yet) can't go live. Returns null if nothing can. Deterministic, like swaps and ink.
 */
export function pickLiveLine(
  board: Board,
  solution: Solution,
  finished: readonly string[],
  avoid: LineSet,
): Line | null {
  let best: Line | null = null;
  let bestDone = -1;
  let bestSize = -1;

  const consider = (kind: LineKind, index: number, cells: Cell[], answer: boolean[]) => {
    if (finished.includes(lineKey(kind, index)) || hasLine(avoid, kind, index)) return;
    const size = answer.filter(Boolean).length;
    if (!size) return;
    const filled = cells.filter((cell, i) => cell === Cell.Filled && answer[i]).length;
    const done = filled / size;
    if (done > bestDone || (done === bestDone && size > bestSize)) {
      best = { kind, index };
      bestDone = done;
      bestSize = size;
    }
  };

  for (let r = 0; r < board.height; r++) consider('row', r, row(board, r), row(solution, r));
  for (let c = 0; c < board.width; c++) consider('col', c, column(board, c), column(solution, c));
  return best;
}
