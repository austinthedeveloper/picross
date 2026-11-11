import type { Grid } from './board';
import { keyToLine, lineKeys, noLines, type Line, type LineSet } from './lines';

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

/**
 * Quarter turns clockwise for a square board that turns mid-fight (#83). Everything
 * tied to a cell or a line turns with the board, so these move them the way
 * `transformGrid(grid, 1)` moves the cells. Negative turns go back.
 */
const quarters = (turns: number) => ((turns % 4) + 4) % 4;

/** Where cell `index` of an n×n board lands after `turns` quarter turns clockwise. */
export function turnIndex(index: number, n: number, turns = 1): number {
  let [r, c] = [Math.floor(index / n), index % n];
  for (let t = 0; t < quarters(turns); t++) [r, c] = [c, n - 1 - r];
  return r * n + c;
}

/**
 * Where a line of an n×n board lands. A quarter turn makes row r column n-1-r, read
 * in the same direction, and column c row c, read backwards (see `turnClue`).
 */
export function turnLine(line: Line, n: number, turns = 1): Line {
  let { kind, index } = line;
  for (let t = 0; t < quarters(turns); t++) {
    [kind, index] = kind === 'row' ? ['col', n - 1 - index] : ['row', index];
  }
  return { kind, index };
}

/** A set of lines, turned with the board. */
export function turnLines(set: LineSet, n: number, turns = 1): LineSet {
  const turned = noLines();
  for (const key of lineKeys(set)) {
    const { kind, index } = turnLine(keyToLine(key), n, turns);
    (kind === 'row' ? turned.rows : turned.cols).push(index);
  }
  return turned;
}

/** A line's clue after the board turns: a column that becomes a row reads backwards. */
export function turnClue(line: Line, clue: readonly number[], n: number, turns = 1) {
  let [at, runs] = [line, [...clue]];
  for (let t = 0; t < quarters(turns); t++) {
    if (at.kind === 'col') runs = runs.reverse();
    at = turnLine(at, n);
  }
  return { line: at, clue: runs };
}
