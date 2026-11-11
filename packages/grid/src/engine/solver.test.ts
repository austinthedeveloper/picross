import { describe, expect, it } from 'vitest';
import { deriveClues } from './clues';
import {
  checkSolution,
  fightPasses,
  linePasses,
  runOrders,
  solve,
  solveLine,
  solveLineAnyOrder,
  Unknown as U,
} from './solver';

describe('linePasses', () => {
  it('counts one pass for clues that give everything away', () => {
    const clues = { rows: [[3], [3], [3]], cols: [[3], [3], [3]] };
    expect(linePasses(3, 3, clues)).toBe(1);
  });

  it('counts a pass for each round of working lines out from their crossings', () => {
    const rows = ['.#.#', '###.', '.##.', '...#'];
    const clues = deriveClues({
      width: 4,
      height: 4,
      cells: [...rows.join('')].map((c) => c === '#'),
    });
    expect(solve(4, 4, clues).status).toBe('unique');
    expect(linePasses(4, 4, clues)).toBe(5);
  });

  it('stops when a puzzle needs a guess', () => {
    // Two solutions: the checkerboard corners can go either way.
    const clues = { rows: [[1], [1]], cols: [[1], [1]] };
    expect(linePasses(2, 2, clues)).toBe(0);
  });
});

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

describe('solve with fog', () => {
  // Heart: .#.#. / ##### / ##### / .###. / ..#..
  const g = grid(['.#.#.', '#####', '#####', '.###.', '..#..']);
  const clues = deriveClues(g);

  it('solves fogged rows from the columns', () => {
    expect(solve(5, 5, clues, { fog: { rows: [1], cols: [] } }).status).toBe('unique');
  });

  it('gets stuck when the columns can’t pin a fogged row down', () => {
    expect(solve(5, 5, clues, { fog: { rows: [2], cols: [] } }).status).toBe('ambiguous');
  });

  it('gets stuck when fog hides too much to ever complete a line', () => {
    const all = [0, 1, 2, 3, 4];
    expect(solve(5, 5, clues, { fog: { rows: all, cols: all } })).toMatchObject({
      status: 'ambiguous',
      unknown: 25,
    });
  });
});

describe('scrambled clues', () => {
  it('lists each distinct order once', () => {
    expect(runOrders([1, 2, 1])).toEqual([
      [1, 2, 1],
      [1, 1, 2],
      [2, 1, 1],
    ]);
    expect(runOrders([3])).toEqual([[3]]);
  });

  it('only forces what every order agrees on', () => {
    // 1 and 3 in a 5-wide line: "1 3" is #.### and "3 1" is ###.#
    expect(solveLineAnyOrder([U, U, U, U, U], [1, 3])).toEqual([1, U, 1, U, 1]);
    // With the first cell empty, neither order fits in the 4 cells left.
    expect(solveLineAnyOrder([0, U, U, U, U], [1, 3])).toBeNull();
  });

  it('solves a puzzle with scrambled lines from the crossings', () => {
    // Rows 1 and 2 have mixed runs ("2 1" and "1 3"), so their order can be scrambled.
    const rows = ['##.#.', '#.###', '#####', '.###.', '..#..'];
    const g = grid(rows);
    const clues = deriveClues(g);
    expect(solve(5, 5, clues, { scramble: { rows: [0, 1], cols: [] } }).status).toBe('unique');
  });
});

describe('fightPasses', () => {
  // Heart: .#.#. / ##### / ##### / .###. / ..#..
  const heart = grid(['.#.#.', '#####', '#####', '.###.', '..#..']);
  const clues = deriveClues(heart);

  it('counts passes like linePasses when nothing is hidden', () => {
    const { passes, status } = fightPasses(5, 5, clues);
    expect(status).toBe('unique');
    expect(passes).toBe(linePasses(5, 5, clues));
  });

  it('says how much of the board the first pass settles', () => {
    const full = { rows: [[3], [3], [3]], cols: [[3], [3], [3]] };
    expect(fightPasses(3, 3, full)).toEqual({ status: 'unique', passes: 1, firstPass: 1 });
    expect(fightPasses(5, 5, clues).firstPass).toBeGreaterThan(0);
    expect(fightPasses(5, 5, clues).firstPass).toBeLessThan(1);
  });

  it('skips fogged lines and suspects, so they fill in from their crossings', () => {
    const plain = fightPasses(5, 5, clues);
    const fogged = fightPasses(5, 5, clues, { fog: { rows: [1], cols: [] } });
    expect(fogged.status).toBe('unique');
    expect(fightPasses(5, 5, clues, { suspects: { rows: [1], cols: [] } })).toEqual(fogged);
    expect(fogged.firstPass).toBeLessThanOrEqual(plain.firstPass);
    expect(fightPasses(5, 5, clues, { fog: { rows: [2], cols: [] } }).status).toBe('ambiguous');
  });

  it('reads scrambled lines in any order', () => {
    const g = grid(['##.#.', '#.###', '#####', '.###.', '..#..']);
    const scrambled = deriveClues(g);
    const result = fightPasses(5, 5, scrambled, { scramble: { rows: [0, 1], cols: [] } });
    expect(result.status).toBe(
      solve(5, 5, scrambled, { scramble: { rows: [0, 1], cols: [] } }).status,
    );
  });

  it('reports a contradiction', () => {
    expect(fightPasses(2, 1, { rows: [[3]], cols: [[], []] }).status).toBe('contradiction');
  });
});
