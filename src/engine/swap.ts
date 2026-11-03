import { Cell, column, row, type Board, type Solution } from './board';
import type { LineKind } from './lines';

/** What the Mimic (#48) does: swaps two rows or two columns and wipes what was in them. */
export interface Swap {
  kind: LineKind;
  lines: [number, number];
  /** Board indexes it wipes: your marks in those lines, except in lines you've finished. */
  cells: number[];
}

/** A line is done when its filled cells match the solution exactly. */
const lineDone = (cells: Cell[], answer: boolean[]) =>
  cells.every((cell, i) => (cell === Cell.Filled) === answer[i]);

const isCorrect = (cell: Cell, answer: boolean) =>
  cell === Cell.Filled ? answer : cell === Cell.Marked ? !answer : false;

/**
 * Picks the Mimic's swap. It goes for the two unfinished rows, or the two
 * unfinished columns, holding the most correct marks, so it always costs you
 * something. Cells that sit in a finished line are never wiped, so a finished
 * line stays finished. Returns null if no swap would cost anything (for example,
 * before you've marked anything). Deterministic, so a fight plays the same way
 * every time.
 */
export function pickSwap(board: Board, solution: Solution): Swap | null {
  const w = board.width;
  const rowsDone = Array.from({ length: board.height }, (_, r) =>
    lineDone(row(board, r), row(solution, r)),
  );
  const colsDone = Array.from({ length: w }, (_, c) =>
    lineDone(column(board, c), column(solution, c)),
  );

  const candidates = (kind: LineKind) => {
    const [done, crossDone, count, length] =
      kind === 'row'
        ? [rowsDone, colsDone, board.height, w]
        : [colsDone, rowsDone, w, board.height];
    return Array.from({ length: count }, (_, i) => {
      const cells: number[] = [];
      let damage = 0;
      if (!done[i]) {
        for (let j = 0; j < length; j++) {
          if (crossDone[j]) continue;
          const at = kind === 'row' ? i * w + j : j * w + i;
          if (board.cells[at] === Cell.Empty) continue;
          cells.push(at);
          if (isCorrect(board.cells[at], solution.cells[at])) damage++;
        }
      }
      return { index: i, cells, damage };
    })
      .filter((line) => line.damage > 0)
      .sort((a, b) => b.damage - a.damage || a.index - b.index)
      .slice(0, 2);
  };

  let best: (Swap & { damage: number }) | null = null;
  for (const kind of ['row', 'col'] as const) {
    const [a, b] = candidates(kind);
    if (!a || !b) continue;
    const damage = a.damage + b.damage;
    if (!best || damage > best.damage) {
      const lines = [a.index, b.index].sort((x, y) => x - y) as [number, number];
      best = { kind, lines, cells: [...a.cells, ...b.cells], damage };
    }
  }
  return best && { kind: best.kind, lines: best.lines, cells: best.cells };
}
