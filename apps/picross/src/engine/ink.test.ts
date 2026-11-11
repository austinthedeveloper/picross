import { describe, expect, it } from 'vitest';
import { Cell, type Board } from './board';
import { pickInk, washInk } from './ink';

const { Empty: _, Filled: F, Marked: X } = Cell;
const board = (rows: Cell[][]): Board => ({
  width: rows[0].length,
  height: rows.length,
  cells: rows.flat(),
});
const none = { rows: [], cols: [] };

describe('pickInk', () => {
  it('covers the block hiding the most of your marks', () => {
    const b = board([
      [_, _, _, _],
      [_, _, F, X],
      [_, _, F, F],
      [_, _, _, _],
    ]);
    expect(pickInk(b, 2, [], none)).toEqual([6, 7, 10, 11]);
  });

  it('skips cells already inked and lines you have completed', () => {
    const b = board([
      [F, F, _, _],
      [F, F, _, _],
      [_, _, _, _],
      [_, _, _, _],
    ]);
    // Row 1 is done and cell 4 is inked, so the only mark left to hide is cell 5. The
    // block below and right of it hides it too, with four fresh cells, so it wins.
    expect(pickInk(b, 2, [4], { rows: [0], cols: [] })).toEqual([5, 6, 9, 10]);
  });

  it('prefers the bigger block when no marks are at stake, then the top-left', () => {
    const b = board([
      [_, _, _],
      [_, _, _],
      [_, _, _],
    ]);
    expect(pickInk(b, 2, [], { rows: [], cols: [0] })).toEqual([1, 2, 4, 5]);
  });

  it('returns nothing when every line is done', () => {
    const b = board([[F]]);
    expect(pickInk(b, 2, [], { rows: [0], cols: [0] })).toEqual([]);
  });
});

describe('washInk', () => {
  it('washes ink out of completed rows and columns', () => {
    // A 4-wide board: cells 1, 5, 6 and 9 inked; row 2 (cells 4-7) and column 2 complete.
    const lines = [
      { kind: 'row' as const, index: 1 },
      { kind: 'col' as const, index: 1 },
    ];
    expect(washInk([1, 5, 6, 10], lines, 4)).toEqual({ ink: [10], washed: [1, 5, 6] });
  });
});
