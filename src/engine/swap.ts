import { Cell, row, type Board, type Solution } from './board';

const solutionRow = (solution: Solution, r: number) =>
  solution.cells.slice(r * solution.width, (r + 1) * solution.width);

/** How many of a row's marks agree with a solution row: fills where filled, X's where empty. */
const agreement = (cells: Cell[], answer: boolean[]) =>
  cells.filter((cell, c) =>
    cell === Cell.Filled ? answer[c] : cell === Cell.Marked ? !answer[c] : false,
  ).length;

/** A row is done when its filled cells match the solution exactly. */
const rowDone = (cells: Cell[], answer: boolean[]) =>
  cells.every((cell, c) => (cell === Cell.Filled) === answer[c]);

/**
 * The two rows the Mimic (#48) swaps. It picks the pair whose swap would turn
 * the most of your correct marks wrong, so it always costs you something and
 * never just swaps a pair back. Finished rows are never touched. Returns null
 * if no swap would hurt (for example, before you've marked anything).
 * Deterministic, so a fight plays the same way every time.
 */
export function pickSwapRows(board: Board, solution: Solution): [number, number] | null {
  const rows = Array.from({ length: board.height }, (_, r) => ({
    r,
    cells: row(board, r),
    answer: solutionRow(solution, r),
  })).filter(({ cells, answer }) => !rowDone(cells, answer));

  let best: { pair: [number, number]; damage: number } | null = null;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const [a, b] = [rows[i], rows[j]];
      const damage =
        agreement(a.cells, a.answer) +
        agreement(b.cells, b.answer) -
        agreement(a.cells, b.answer) -
        agreement(b.cells, a.answer);
      if (damage > 0 && (!best || damage > best.damage)) best = { pair: [a.r, b.r], damage };
    }
  }
  return best?.pair ?? null;
}
