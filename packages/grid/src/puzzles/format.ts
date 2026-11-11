import type { Solution } from '../engine/board';
import { deriveClues, type Clues } from '../engine/clues';
import { getGadget } from '@picross/story/puzzles/gadgets';

/**
 * Puzzle file format. `solution` has one string per row, `#` for a filled
 * cell and `.` for an empty one.
 */
export interface PuzzleFile {
  id: string;
  name: string;
  width: number;
  height: number;
  solution: string[];
  /** Gadget this picture becomes when solved in a run (#28). */
  gadget?: string;
}

export interface Puzzle {
  id: string;
  name: string;
  width: number;
  height: number;
  solution: Solution;
  clues: Clues;
  /** Gadget id this picture becomes when solved in a run. */
  gadget?: string;
}

export function parsePuzzle(data: unknown): Puzzle {
  const file = data as Partial<PuzzleFile>;
  const id = file?.id;
  const fail = (msg: string): never => {
    throw new Error(`Invalid puzzle${typeof id === 'string' ? ` "${id}"` : ''}: ${msg}`);
  };

  if (typeof id !== 'string' || !id) fail('missing id');
  if (typeof file.name !== 'string' || !file.name) fail('missing name');
  const { width, height, solution } = file;
  if (!Number.isInteger(width) || width! < 1) fail('width must be a positive integer');
  if (!Number.isInteger(height) || height! < 1) fail('height must be a positive integer');
  if (!Array.isArray(solution) || solution.length !== height) {
    fail(`solution must have ${height} rows`);
  }

  const cells: boolean[] = [];
  solution!.forEach((line, r) => {
    if (typeof line !== 'string' || line.length !== width) {
      fail(`row ${r} must be ${width} characters`);
    }
    for (const ch of line) {
      if (ch !== '#' && ch !== '.') fail(`row ${r} has invalid character "${ch}"`);
      cells.push(ch === '#');
    }
  });
  if (!cells.includes(true)) fail('solution is empty');
  if (file.gadget !== undefined && !getGadget(file.gadget)) {
    fail(`unknown gadget "${file.gadget}"`);
  }

  const grid: Solution = { width: width!, height: height!, cells };
  return {
    id: id!,
    name: file.name!,
    width: width!,
    height: height!,
    solution: grid,
    clues: deriveClues(grid),
    ...(file.gadget ? { gadget: file.gadget } : {}),
  };
}

/** Builds a puzzle file from a drawn grid. */
export function toPuzzleFile(
  id: string,
  name: string,
  width: number,
  height: number,
  cells: readonly boolean[],
): PuzzleFile {
  const solution: string[] = [];
  for (let r = 0; r < height; r++) {
    solution.push(
      cells
        .slice(r * width, (r + 1) * width)
        .map((filled) => (filled ? '#' : '.'))
        .join(''),
    );
  }
  return { id, name, width, height, solution };
}

/** Pack-style JSON: one solution row per line. */
export function stringifyPuzzle(file: PuzzleFile): string {
  return JSON.stringify(file, null, 2) + '\n';
}

/** Turns a name into a puzzle id, e.g. "Music Note!" → "music-note". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
