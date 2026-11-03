import { deriveClues, type Clues } from './clues';
import { liftFog, noFog, type Fog } from './fog';

/** Solver cell knowledge: unknown, known empty, or known filled. */
export const Unknown = -1;
export type Knowledge = -1 | 0 | 1;

/**
 * Finds every cell a single line forces, given its clues and what is already
 * known. Returns null if no arrangement of the clues fits.
 *
 * `fits[i][j]` says whether cells i.. can hold clues j..; a forward pass then
 * walks only the arrangements that fit and records what each cell can be.
 */
export function solveLine(
  line: readonly Knowledge[],
  clues: readonly number[],
): Knowledge[] | null {
  const n = line.length;
  const m = clues.length;
  const canEmpty = (i: number) => line[i] !== 1;
  const blockFits = (i: number, k: number) => {
    if (i + k > n) return false;
    for (let x = i; x < i + k; x++) if (line[x] === 0) return false;
    return i + k === n || canEmpty(i + k);
  };

  const fits: boolean[][] = Array.from({ length: n + 2 }, () =>
    new Array<boolean>(m + 1).fill(false),
  );
  fits[n][m] = true;
  fits[n + 1][m] = true;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      let ok = canEmpty(i) && fits[i + 1][j];
      if (!ok && j < m && blockFits(i, clues[j])) ok = fits[i + clues[j] + 1][j + 1];
      fits[i][j] = ok;
    }
  }
  if (!fits[0][0]) return null;

  const mayFill = new Array<boolean>(n).fill(false);
  const mayEmpty = new Array<boolean>(n).fill(false);
  const reached: boolean[][] = Array.from({ length: n + 2 }, () =>
    new Array<boolean>(m + 1).fill(false),
  );
  reached[0][0] = true;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= m; j++) {
      if (!reached[i][j]) continue;
      if (canEmpty(i) && fits[i + 1][j]) {
        mayEmpty[i] = true;
        reached[i + 1][j] = true;
      }
      if (j < m && blockFits(i, clues[j]) && fits[i + clues[j] + 1][j + 1]) {
        const end = i + clues[j];
        for (let x = i; x < end; x++) mayFill[x] = true;
        if (end < n) mayEmpty[end] = true;
        reached[end + 1][j + 1] = true;
      }
    }
  }

  return line.map((known, i) => {
    if (known !== Unknown) return known;
    if (mayFill[i] && !mayEmpty[i]) return 1;
    if (mayEmpty[i] && !mayFill[i]) return 0;
    return Unknown;
  });
}

export type SolveResult =
  | { status: 'unique'; grid: Knowledge[] }
  | { status: 'ambiguous'; grid: Knowledge[]; unknown: number }
  | { status: 'contradiction' };

/**
 * Line-solves a puzzle from its clues alone, repeating until no line gives
 * anything new. 'unique' means it has exactly one solution and can be
 * reached without guessing. 'ambiguous' means guessing is needed, which
 * usually means there is more than one solution.
 *
 * With `fog`, fogged clues start hidden and the solve plays out like the
 * game: whenever a line becomes fully known it lifts fog by the same rule
 * (`liftFog`), and the revealed clues join in.
 */
export function solve(
  width: number,
  height: number,
  clues: Clues,
  fog: Fog = noFog(),
): SolveResult {
  const grid: Knowledge[] = new Array<Knowledge>(width * height).fill(Unknown);
  const at = (r: number, c: number) => grid[r * width + c];
  const rowCells = (r: number) => grid.slice(r * width, (r + 1) * width);
  const colCells = (c: number) => Array.from({ length: height }, (_, r) => at(r, c));
  let hidden = fog;
  const dirtyRows = new Set<number>();
  const dirtyCols = new Set<number>();
  const reveal = (kind: 'row' | 'col', count: number) => {
    for (let i = 0; i < count; i++) {
      if (!(kind === 'row' ? hidden.rows : hidden.cols).includes(i)) {
        (kind === 'row' ? dirtyRows : dirtyCols).add(i);
      }
    }
  };
  reveal('row', height);
  reveal('col', width);
  const completed = new Set<string>();

  for (;;) {
    while (dirtyRows.size || dirtyCols.size) {
      for (const r of dirtyRows) {
        dirtyRows.delete(r);
        const line = rowCells(r);
        const solved = solveLine(line, clues.rows[r]);
        if (!solved) return { status: 'contradiction' };
        solved.forEach((v, c) => {
          if (v !== line[c]) {
            grid[r * width + c] = v;
            if (!hidden.cols.includes(c)) dirtyCols.add(c);
          }
        });
      }
      for (const c of dirtyCols) {
        dirtyCols.delete(c);
        const line = colCells(c);
        const solved = solveLine(line, clues.cols[c]);
        if (!solved) return { status: 'contradiction' };
        solved.forEach((v, r) => {
          if (v !== line[r]) {
            grid[r * width + c] = v;
            if (!hidden.rows.includes(r)) dirtyRows.add(r);
          }
        });
      }
    }

    // Lines that are now fully known count as completed and lift fog.
    const before = hidden.rows.length + hidden.cols.length;
    for (let r = 0; r < height; r++) {
      if (!completed.has(`r${r}`) && !rowCells(r).includes(Unknown)) {
        completed.add(`r${r}`);
        hidden = liftFog(hidden, 'row', r, (c) => at(r, c) === 1);
      }
    }
    for (let c = 0; c < width; c++) {
      if (!completed.has(`c${c}`) && !colCells(c).includes(Unknown)) {
        completed.add(`c${c}`);
        hidden = liftFog(hidden, 'col', c, (r) => at(r, c) === 1);
      }
    }
    if (hidden.rows.length + hidden.cols.length === before) break;
    reveal('row', height);
    reveal('col', width);
  }

  const unknown = grid.filter((v) => v === Unknown).length;
  return unknown ? { status: 'ambiguous', grid, unknown } : { status: 'unique', grid };
}

/** Checks a solution grid: derives its clues and line-solves them. */
export function checkSolution(width: number, height: number, cells: readonly boolean[]) {
  return solve(width, height, deriveClues({ width, height, cells: [...cells] }));
}
