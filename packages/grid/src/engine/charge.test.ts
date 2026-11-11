import { describe, expect, it } from 'vitest';
import { Cell, type Solution } from './board';
import { pickLiveLine } from './charge';
import { noLines } from './lines';

const { Empty: _, Filled: F } = Cell;
// 4x3 solution: #### / ##.. / ....
const solution: Solution = {
  width: 4,
  height: 3,
  cells: [
    [1, 1, 1, 1],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
  ]
    .flat()
    .map(Boolean),
};
const empty = { width: 4, height: 3, cells: new Array<Cell>(12).fill(_) };

describe('pickLiveLine', () => {
  it('starts on the line with the most cells to fill', () => {
    expect(pickLiveLine(empty, solution, [], noLines())).toEqual({ kind: 'row', index: 0 });
  });

  it('goes for the line you are furthest through', () => {
    const board = { ...empty, cells: [_, _, _, _, F, _, _, _, _, _, _, _] };
    // Row 2 and column 1 are both half done; row 2 comes first.
    expect(pickLiveLine(board, solution, [], noLines())).toEqual({ kind: 'row', index: 1 });
  });

  it('skips finished lines, lines it should avoid, and blank lines', () => {
    expect(pickLiveLine(empty, solution, ['r0'], noLines())).toEqual({ kind: 'row', index: 1 });
    expect(pickLiveLine(empty, solution, ['r0'], { rows: [1], cols: [] })).toEqual({
      kind: 'col',
      index: 0,
    });
  });

  it('returns null when nothing can go live', () => {
    const finished = ['r0', 'r1', 'c0', 'c1', 'c2', 'c3'];
    expect(pickLiveLine(empty, solution, finished, noLines())).toBeNull();
  });
});
