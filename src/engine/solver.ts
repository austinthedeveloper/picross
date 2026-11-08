import { clueOfMask, type Clue } from './clues';
import { allLines, type Dims, type Line, volume } from './volume';

/** What the solver knows about a cube. */
export const UNKNOWN = 0;
export const FILLED = 1;
export const EMPTY = 2;
export type Knowledge = typeof UNKNOWN | typeof FILLED | typeof EMPTY;

/** Every arrangement of a line of `length` cubes that fits a clue, as bit masks. */
const cache = new Map<string, Uint16Array>();
function arrangements(length: number, clue: Clue | null): Uint16Array {
  const key = clue ? `${length}:${clue.count}:${clue.pieces ?? '?'}` : `${length}:any`;
  let masks = cache.get(key);
  if (!masks) {
    const fits: number[] = [];
    for (let m = 0; m < 1 << length; m++) {
      if (!clue) fits.push(m);
      else {
        const c = clueOfMask(m, length);
        if (c.count === clue.count && (clue.pieces === null || c.pieces === clue.pieces)) {
          fits.push(m);
        }
      }
    }
    masks = Uint16Array.from(fits);
    cache.set(key, masks);
  }
  return masks;
}

/** The longest line the solver handles (bit masks in a Uint16Array). */
export const MAX_LINE = 15;

export interface LineStep {
  line: Line;
  /** Cubes this line proves are part of the shape. */
  filled: number[];
  /** Cubes this line proves are not. */
  empty: number[];
}

/**
 * What one line can prove from what's known: the cubes every arrangement that fits its
 * clue agrees on. Returns null when nothing fits (a contradiction).
 */
export function solveLine(line: Line, clue: Clue | null, known: Uint8Array): LineStep | null {
  const n = line.cells.length;
  let knownMask = 0;
  let filledMask = 0;
  line.cells.forEach((cell, t) => {
    if (known[cell] !== UNKNOWN) knownMask |= 1 << t;
    if (known[cell] === FILLED) filledMask |= 1 << t;
  });
  const full = (1 << n) - 1;
  let always = full;
  let never = full;
  let any = false;
  for (const m of arrangements(n, clue)) {
    if ((m & knownMask) !== filledMask) continue;
    any = true;
    always &= m;
    never &= ~m;
  }
  if (!any) return null;
  const step: LineStep = { line, filled: [], empty: [] };
  line.cells.forEach((cell, t) => {
    if (known[cell] !== UNKNOWN) return;
    if ((always >> t) & 1) step.filled.push(cell);
    else if ((never >> t) & 1) step.empty.push(cell);
  });
  return step;
}

export interface SolveResult {
  known: Uint8Array;
  /** Every cube is known. With line logic that means one solution, reached without guessing. */
  solved: boolean;
  contradiction: boolean;
  /** How many sweeps over the lines it took: a rough measure of difficulty. */
  passes: number;
}

/**
 * Line solver. Repeats `solveLine` over every line with a clue (or every line, with
 * `null` for a hidden one) until nothing new is proved.
 */
export function solve(
  d: Dims,
  clues: readonly (Clue | null)[],
  start?: Uint8Array,
  lines: readonly Line[] = allLines(d),
): SolveResult {
  const known = start ? Uint8Array.from(start) : new Uint8Array(volume(d));
  const linesOf: number[][] = Array.from({ length: known.length }, () => []);
  for (const line of lines) for (const cell of line.cells) linesOf[cell].push(line.id);
  const dirty = new Set(lines.filter((l) => clues[l.id] !== null || start).map((l) => l.id));
  let passes = 0;
  while (dirty.size) {
    passes++;
    const batch = [...dirty];
    dirty.clear();
    for (const id of batch) {
      const step = solveLine(lines[id], clues[id], known);
      if (!step) return { known, solved: false, contradiction: true, passes };
      for (const cell of step.filled) known[cell] = FILLED;
      for (const cell of step.empty) known[cell] = EMPTY;
      for (const cell of [...step.filled, ...step.empty]) {
        for (const other of linesOf[cell]) if (other !== id) dirty.add(other);
      }
    }
  }
  return { known, solved: !known.includes(UNKNOWN), contradiction: false, passes };
}

/** The first line that proves something new from `known`, for hints. */
export function nextStep(
  d: Dims,
  clues: readonly (Clue | null)[],
  known: Uint8Array,
  lines: readonly Line[] = allLines(d),
): LineStep | null {
  let best: LineStep | null = null;
  for (const line of lines) {
    const step = solveLine(line, clues[line.id], known);
    if (!step) continue;
    const size = step.filled.length + step.empty.length;
    // Prefer the line that proves the most, so a hint feels worth it.
    if (size && (!best || size > best.filled.length + best.empty.length)) best = step;
  }
  return best;
}
