import { deriveClues, type Clues } from './clues';
import { noLines, removeLine, type LineSet } from './lines';

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

/** Every distinct order of a line's runs, e.g. [1, 2, 1] → [1,2,1], [1,1,2], [2,1,1]. */
export function runOrders(clues: readonly number[]): number[][] {
  if (clues.length <= 1) return [[...clues]];
  const seen = new Set<string>();
  const out: number[][] = [];
  clues.forEach((first, i) => {
    if (seen.has(String(first))) return;
    seen.add(String(first));
    const rest = [...clues.slice(0, i), ...clues.slice(i + 1)];
    for (const tail of runOrders(rest)) out.push([first, ...tail]);
  });
  return out;
}

/**
 * Like `solveLine`, but the runs can come in any order (the Clockwork Owl's
 * scrambled clues, #49): a cell is forced only if every order that fits forces
 * it the same way. Returns null if no order fits.
 */
export function solveLineAnyOrder(
  line: readonly Knowledge[],
  clues: readonly number[],
): Knowledge[] | null {
  let merged: Knowledge[] | null = null;
  for (const order of runOrders(clues)) {
    const solved = solveLine(line, order);
    if (!solved) continue;
    merged = merged ? merged.map((v, i) => (v === solved[i] ? v : Unknown)) : solved;
  }
  return merged;
}

/**
 * How many passes over every row, then every column, a line solver needs to finish
 * a puzzle from its clues alone: a rough measure of how hard it is (#112). A puzzle
 * it can't finish returns the passes it managed. It's `fightPasses` with nothing hidden.
 */
export function linePasses(width: number, height: number, clues: Clues): number {
  return fightPasses(width, height, clues).passes;
}

/** How hard a fight's board is for a line solver (#168), from `fightPasses`. */
export interface FightPasses {
  /** 'unique' when it finishes without guessing, as `solve` says. */
  status: 'unique' | 'ambiguous' | 'contradiction';
  /** Passes over the readable lines that settled something, counted like `linePasses`. */
  passes: number;
  /** Share of the board's cells (0 to 1) the first pass settles. */
  firstPass: number;
}

/**
 * A fight's difficulty with every power that hides clues applied from the start (#168):
 * passes over every row, then every column, like `linePasses`, reading only the clues a
 * player can trust. Fogged lines and 🎭 suspects are skipped (only crossing lines fill
 * them in), and scrambled lines are solved in any order (`solveLineAnyOrder`). Finishing a
 * hidden line reveals nothing new, so they stay skipped. More passes and a smaller first
 * pass mean harder (docs/architecture.md, "Difficulty"). It can't see armor, charge, ink,
 * swaps or turns.
 */
export function fightPasses(
  width: number,
  height: number,
  clues: Clues,
  {
    fog = noLines(),
    scramble = noLines(),
    suspects = noLines(),
  }: { fog?: LineSet; scramble?: LineSet; suspects?: LineSet } = {},
): FightPasses {
  const grid: Knowledge[] = new Array<Knowledge>(width * height).fill(Unknown);
  const hidden = (kind: 'rows' | 'cols', i: number) =>
    fog[kind].includes(i) || suspects[kind].includes(i);
  const work = (kind: 'rows' | 'cols', i: number, cells: number[]): boolean | null => {
    if (hidden(kind, i)) return false;
    const line = cells.map((n) => grid[n]);
    const runs = clues[kind][i];
    const solved = scramble[kind].includes(i)
      ? solveLineAnyOrder(line, runs)
      : solveLine(line, runs);
    if (!solved) return null;
    let changed = false;
    solved.forEach((value, n) => {
      if (value !== Unknown && grid[cells[n]] !== value) {
        grid[cells[n]] = value;
        changed = true;
      }
    });
    return changed;
  };
  const rowCells = (r: number) => Array.from({ length: width }, (_, c) => r * width + c);
  const colCells = (c: number) => Array.from({ length: height }, (_, r) => r * width + c);
  const settled = () => grid.filter((v) => v !== Unknown).length / grid.length;
  let firstPass = 0;
  for (let passes = 0; ; passes++) {
    let changed = false;
    for (const [kind, count, cells] of [
      ['rows', height, rowCells],
      ['cols', width, colCells],
    ] as const) {
      for (let i = 0; i < count; i++) {
        const result = work(kind, i, cells(i));
        if (result === null) return { status: 'contradiction', passes, firstPass };
        changed = result || changed;
      }
    }
    if (passes === 0) firstPass = settled();
    if (!changed) {
      return { status: grid.includes(Unknown) ? 'ambiguous' : 'unique', passes, firstPass };
    }
  }
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
 * It plays out like the game. With `fog`, fogged clues start hidden: a fogged
 * line can only be filled in from its crossing lines, and its clue is
 * revealed once all its cells are known. With `scramble`, those
 * lines' runs are known but not their order until the line is complete.
 */
export function solve(
  width: number,
  height: number,
  clues: Clues,
  { fog = noLines(), scramble = noLines() }: { fog?: LineSet; scramble?: LineSet } = {},
): SolveResult {
  const grid: Knowledge[] = new Array<Knowledge>(width * height).fill(Unknown);
  const rowCells = (r: number) => grid.slice(r * width, (r + 1) * width);
  const colCells = (c: number) => Array.from({ length: height }, (_, r) => grid[r * width + c]);
  let hidden = fog;
  let scrambled = scramble;
  const lineSolver = (kind: 'row' | 'col', i: number) =>
    (kind === 'row' ? scrambled.rows : scrambled.cols).includes(i) ? solveLineAnyOrder : solveLine;
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
        const solved = lineSolver('row', r)(line, clues.rows[r]);
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
        const solved = lineSolver('col', c)(line, clues.cols[c]);
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
        hidden = removeLine(hidden, 'row', r);
        scrambled = removeLine(scrambled, 'row', r);
      }
    }
    for (let c = 0; c < width; c++) {
      if (!completed.has(`c${c}`) && !colCells(c).includes(Unknown)) {
        completed.add(`c${c}`);
        hidden = removeLine(hidden, 'col', c);
        scrambled = removeLine(scrambled, 'col', c);
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
