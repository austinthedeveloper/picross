import { revealedCell, type Board, type Solution } from './board';

/** Where a bomb went off (#115): the cells it hits, and the cell at its center. */
export interface Blast {
  cells: number[];
  row: number;
  col: number;
}

/**
 * How many cells across a bomb's blast is (#115). About a tenth of a 10×10 or
 * 15×15 board. A 20×20 stays at 5×5, because the Curator's puzzle gains the most
 * from a blast and a bigger one would nearly halve it.
 */
export const blastSize = (width: number, height: number) => (Math.min(width, height) >= 15 ? 5 : 3);

/**
 * Picks where a bomb goes off: any spot where at least half the blast lands on
 * unsolved cells (ones the reveal would change), so a bomb is never wasted on a
 * finished corner. If no spot qualifies, any of the spots with the most. Returns
 * null when nothing is left to reveal.
 */
export function pickBlast(
  board: Board,
  solution: Solution,
  size: number,
  rand: () => number = Math.random,
): Blast | null {
  const { width: w, height: h } = board;
  const s = Math.min(size, w, h);
  const spots: { top: number; left: number; unsolved: number }[] = [];
  for (let top = 0; top + s <= h; top++) {
    for (let left = 0; left + s <= w; left++) {
      let unsolved = 0;
      for (let r = top; r < top + s; r++) {
        for (let c = left; c < left + s; c++) {
          const i = r * w + c;
          if (board.cells[i] !== revealedCell(solution, i)) unsolved++;
        }
      }
      spots.push({ top, left, unsolved });
    }
  }
  const most = Math.max(...spots.map((spot) => spot.unsolved));
  if (most === 0) return null;
  const halfway = (s * s) / 2;
  const open = spots.filter((spot) => spot.unsolved >= Math.min(halfway, most));
  const { top, left } = open[Math.floor(rand() * open.length)];
  const cells: number[] = [];
  for (let r = top; r < top + s; r++) {
    for (let c = left; c < left + s; c++) cells.push(r * w + c);
  }
  const middle = Math.floor(s / 2);
  return { cells, row: top + middle, col: left + middle };
}
