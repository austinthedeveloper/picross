import type { Solution } from '../engine/board';
import { deriveClues, type Clues } from '../engine/clues';

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
}

export interface Puzzle {
  id: string;
  name: string;
  width: number;
  height: number;
  solution: Solution;
  clues: Clues;
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

  const grid: Solution = { width: width!, height: height!, cells };
  return {
    id: id!,
    name: file.name!,
    width: width!,
    height: height!,
    solution: grid,
    clues: deriveClues(grid),
  };
}
