import { clueOf, type Clue } from '../engine/clues';
import { MAX_LINE } from '../engine/solver';
import { allLines, type Dims, type Line, volume } from '../engine/volume';

/**
 * The colors a shape can be painted when it's revealed. Each is a token in play-block's
 * `src/styles/voxels.css` (`--vox-<name>`), with light, dark and high-contrast values.
 */
export const COLORS = [
  'graphite',
  'stone',
  'white',
  'cream',
  'wood',
  'brown',
  'red',
  'coral',
  'orange',
  'yellow',
  'leaf',
  'green',
  'teal',
  'sky',
  'blue',
  'purple',
  'pink',
] as const;
export type ColorName = (typeof COLORS)[number];

/**
 * A puzzle file (`src/puzzles/pack/*.json`):
 *
 * - `layers`: the shape, bottom layer first. Each layer is rows from the back to the front,
 *   each row a string from left to right: `.` is empty, any other letter a cube of that color.
 * - `colors`: what each letter means, a name from `COLORS`.
 * - `hide`: which clues start hidden, as hex: bit `i` is line `i` of `allLines()`. Written
 *   by `npm run puzzles`; a missing `hide` shows every clue.
 * - `hideRatio`: how many clues `npm run puzzles` tries to hide (0 to 1). Default 0.5.
 * - `passes`: how many sweeps the line solver needs with those clues, written by
 *   `npm run puzzles`: a rough difficulty, which orders puzzles of the same size.
 */
export interface PuzzleFile {
  id: string;
  name: string;
  colors: Record<string, ColorName>;
  layers: string[][];
  hide?: string;
  hideRatio?: number;
  passes?: number;
}

export interface Puzzle {
  id: string;
  name: string;
  dims: Dims;
  /** Per cube: 0 for empty, otherwise 1 + an index into `palette`. */
  solution: Uint8Array;
  palette: ColorName[];
  lines: Line[];
  /** Per line: its clue, or null when it's hidden. */
  clues: (Clue | null)[];
  /** Every clue, hidden or not (for checking and hints). */
  allClues: Clue[];
  /** Line solver sweeps needed (see `PuzzleFile.passes`). */
  passes: number;
}

export const isFilled = (p: Puzzle, cell: number) => p.solution[cell] !== 0;

export function encodeHidden(hidden: readonly boolean[]): string {
  let out = '';
  for (let i = 0; i < hidden.length; i += 4) {
    let nibble = 0;
    for (let b = 0; b < 4; b++) if (hidden[i + b]) nibble |= 1 << b;
    out += nibble.toString(16);
  }
  return out;
}

export function decodeHidden(hex: string | undefined, count: number): boolean[] {
  const hidden: boolean[] = [];
  for (let i = 0; i < count; i++) {
    const nibble = hex ? parseInt(hex[i >> 2] ?? '0', 16) : 0;
    hidden.push(((nibble >> (i & 3)) & 1) === 1);
  }
  return hidden;
}

/** Checks a puzzle file and builds the puzzle. Throws with what's wrong. */
export function parsePuzzle(file: PuzzleFile): Puzzle {
  const fail = (why: string) => {
    throw new Error(`Puzzle ${file.id ?? '?'}: ${why}`);
  };
  if (!/^[a-z0-9-]+$/.test(file.id ?? '')) fail('id must be lowercase letters, digits and dashes');
  if (!file.name) fail('missing name');
  const layers = file.layers ?? [];
  const dims: Dims = {
    y: layers.length,
    z: layers[0]?.length ?? 0,
    x: layers[0]?.[0]?.length ?? 0,
  };
  if (!dims.x || !dims.y || !dims.z) fail('empty layers');
  if (Math.max(dims.x, dims.y, dims.z) > MAX_LINE) fail(`longer than ${MAX_LINE} cubes`);
  const palette: ColorName[] = [];
  const letterIndex = new Map<string, number>();
  for (const [letter, color] of Object.entries(file.colors ?? {})) {
    if (letter.length !== 1 || letter === '.') fail(`bad color letter "${letter}"`);
    if (!COLORS.includes(color)) fail(`unknown color "${color}"`);
    letterIndex.set(letter, palette.length + 1);
    palette.push(color);
  }
  const solution = new Uint8Array(volume(dims));
  layers.forEach((layer, y) => {
    if (layer.length !== dims.z) fail(`layer ${y + 1} has ${layer.length} rows, not ${dims.z}`);
    layer.forEach((row, z) => {
      if (row.length !== dims.x) fail(`layer ${y + 1} row ${z + 1} isn't ${dims.x} wide`);
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const color = letterIndex.get(ch);
        if (!color) fail(`layer ${y + 1} row ${z + 1}: no color for "${ch}"`);
        solution[x + dims.x * (z + dims.z * y)] = color!;
      });
    });
  });
  if (!solution.some((c) => c)) fail('no cubes in the shape');
  const lines = allLines(dims);
  const allClues = lines.map((l) => clueOf(l.cells.map((c) => solution[c] !== 0)));
  const hidden = decodeHidden(file.hide, lines.length);
  return {
    id: file.id,
    name: file.name,
    dims,
    solution,
    palette,
    lines,
    allClues,
    clues: allClues.map((c, i) => (hidden[i] ? null : c)),
    passes: file.passes ?? 0,
  };
}
