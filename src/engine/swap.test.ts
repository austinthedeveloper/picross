import { describe, expect, it } from 'vitest';
import { Cell, type Board, type Solution } from './board';
import { pickSwapRows } from './swap';

const { Empty: _, Filled: F, Marked: X } = Cell;
// 4x4 solution: #### / ##.. / ..## / .##.
const solution: Solution = {
  width: 4,
  height: 4,
  cells: [
    [1, 1, 1, 1],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [0, 1, 1, 0],
  ]
    .flat()
    .map(Boolean),
};
const board = (rows: Cell[][]): Board => ({ width: 4, height: 4, cells: rows.flat() });

describe('pickSwapRows', () => {
  it('picks the swap that turns the most correct marks wrong', () => {
    const b = board([
      [F, F, F, F], // done: never swapped
      [F, _, X, X], // 3 correct here, none would fit row 3
      [X, X, F, _], // 3 correct here, none would fit row 2
      [_, _, _, _],
    ]);
    expect(pickSwapRows(b, solution)).toEqual([1, 2]);
  });

  it('never swaps a pair back (that would help you)', () => {
    // Rows 3 and 4 hold each other's answers: swapping them again would fix both.
    const b = board([
      [_, _, _, _],
      [_, _, _, _],
      [X, F, F, X],
      [X, X, F, F],
    ]);
    expect(pickSwapRows(b, solution)).not.toEqual([2, 3]);
  });

  it('returns null before you have marked anything', () => {
    const empty = board([
      [_, _, _, _],
      [_, _, _, _],
      [_, _, _, _],
      [_, _, _, _],
    ]);
    expect(pickSwapRows(empty, solution)).toBeNull();
  });
});
