import { Cell, type Board } from './board';
import type { Line } from './lines';

/**
 * Where a cuttlefish squirts ink (#67): the size×size block hiding the most of
 * your marks. Cells already inked, and cells in lines you've completed, are
 * skipped (completing a line is how ink washes off, so it never lands there).
 * Ties go to the block with more cells to ink, then the top-left-most.
 * Deterministic, so a fight plays the same way every time. Returns the new
 * cells to ink, or none if there's nowhere left.
 */
export function pickInk(
  board: Board,
  size: number,
  inked: readonly number[],
  done: { rows: readonly number[]; cols: readonly number[] },
): number[] {
  const { width: w, height: h } = board;
  const s = Math.min(size, w, h);
  let best: { cells: number[]; marks: number } | null = null;
  for (let top = 0; top + s <= h; top++) {
    for (let left = 0; left + s <= w; left++) {
      const cells: number[] = [];
      let marks = 0;
      for (let r = top; r < top + s; r++) {
        if (done.rows.includes(r)) continue;
        for (let c = left; c < left + s; c++) {
          const i = r * w + c;
          if (done.cols.includes(c) || inked.includes(i)) continue;
          cells.push(i);
          if (board.cells[i] !== Cell.Empty) marks++;
        }
      }
      if (
        cells.length &&
        (!best || marks > best.marks || (marks === best.marks && cells.length > best.cells.length))
      ) {
        best = { cells, marks };
      }
    }
  }
  return best?.cells ?? [];
}

/** Ink left after completed lines wash through it, and the cells they washed. */
export function washInk(
  inked: readonly number[],
  lines: readonly Line[],
  width: number,
): { ink: number[]; washed: number[] } {
  const inLine = (i: number) =>
    lines.some((l) => (l.kind === 'row' ? Math.floor(i / width) : i % width) === l.index);
  return { ink: inked.filter((i) => !inLine(i)), washed: inked.filter(inLine) };
}
