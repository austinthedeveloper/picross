import { describe, expect, it } from 'vitest';
import { Cell, type Board, type Solution } from './board';
import { pickSwap } from './swap';

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

describe('pickSwap', () => {
  it('wipes the two unfinished rows holding the most correct marks', () => {
    const b = board([
      [F, F, F, F], // done: never wiped
      [_, _, X, X], // 2 correct
      [X, X, _, _], // 2 correct
      [_, _, _, _],
    ]);
    expect(pickSwap(b, solution)).toEqual({ kind: 'row', lines: [1, 2], cells: [6, 7, 8, 9] });
  });

  it('picks columns when they hold more', () => {
    const b = board([
      [_, F, _, _],
      [_, _, _, X],
      [_, X, _, F],
      [_, F, _, X],
    ]);
    expect(pickSwap(b, solution)).toEqual({
      kind: 'col',
      lines: [1, 3],
      cells: [1, 9, 13, 7, 11, 15],
    });
  });

  it('keeps marks that are part of a finished line', () => {
    const b = board([
      [F, _, _, _],
      [F, _, X, X],
      [X, X, F, _],
      [X, _, _, _], // column 1 is done, so its cells stay
    ]);
    expect(pickSwap(b, solution)).toEqual({ kind: 'row', lines: [1, 2], cells: [6, 7, 9, 10] });
  });

  it('returns null before you have marked anything', () => {
    const empty = board([
      [_, _, _, _],
      [_, _, _, _],
      [_, _, _, _],
      [_, _, _, _],
    ]);
    expect(pickSwap(empty, solution)).toBeNull();
  });
});
