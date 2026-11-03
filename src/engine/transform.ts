import type { Grid } from './board';

/**
 * The eight ways to turn or flip a grid (the daily puzzle, #69). Each keeps a
 * puzzle uniquely solvable: its clues are the original's, moved or reversed.
 */
export const TRANSFORMS = [
  'as drawn',
  'turned a quarter',
  'turned upside down',
  'turned three quarters',
  'flipped',
  'flipped and turned a quarter',
  'flipped upside down',
  'flipped and turned three quarters',
] as const;

export type Transform = number;

/** Turns `t % 4` quarter turns clockwise, after a left-right flip if `t >= 4`. */
export function transformGrid<T>(grid: Grid<T>, t: Transform): Grid<T> {
  let { width: w, height: h } = grid;
  let at = (r: number, c: number) => grid.cells[r * grid.width + c];
  if (t >= 4) {
    const [prev, fw] = [at, w]; // pin the width: turning below reassigns w
    at = (r, c) => prev(r, fw - 1 - c);
  }
  for (let turn = 0; turn < t % 4; turn++) {
    const prev = at;
    const [pw, ph] = [w, h];
    at = (r, c) => prev(ph - 1 - c, r);
    [w, h] = [ph, pw];
  }
  const cells: T[] = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) cells.push(at(r, c));
  return { width: w, height: h, cells };
}
