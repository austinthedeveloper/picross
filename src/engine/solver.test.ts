import { describe, expect, it } from 'vitest';
import { checkSolution, solveLine, Unknown as U } from './solver';

describe('solveLine', () => {
  it('fills the overlap of a long run', () => {
    expect(solveLine([U, U, U, U, U], [4])).toEqual([U, 1, 1, 1, U]);
  });

  it('solves a full line', () => {
    expect(solveLine([U, U, U, U, U], [2, 2])).toEqual([1, 1, 0, 1, 1]);
  });

  it('marks everything empty for no clues', () => {
    expect(solveLine([U, U, U], [])).toEqual([0, 0, 0]);
  });

  it('uses known cells', () => {
    expect(solveLine([U, 1, U, U, U], [1])).toEqual([0, 1, 0, 0, 0]);
    expect(solveLine([U, U, 0, U, U], [2])).toEqual([U, U, 0, U, U]);
  });

  it('detects contradictions', () => {
    expect(solveLine([1, 1, 1, U], [2])).toBeNull();
  });
});

const grid = (rows: string[]) => ({
  width: rows[0].length,
  height: rows.length,
  cells: rows
    .join('')
    .split('')
    .map((ch) => ch === '#'),
});

describe('checkSolution', () => {
  it('accepts a uniquely line-solvable puzzle', () => {
    const g = grid(['.#.#.', '#####', '#####', '.###.', '..#..']);
    expect(checkSolution(g.width, g.height, g.cells).status).toBe('unique');
  });

  it('flags a puzzle with two solutions', () => {
    const g = grid(['#.', '.#']);
    const result = checkSolution(g.width, g.height, g.cells);
    expect(result).toMatchObject({ status: 'ambiguous', unknown: 4 });
  });
});
