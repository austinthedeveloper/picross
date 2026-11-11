import { describe, expect, it } from 'vitest';
import { Cell, column, createBoard, getCell, isSolved, row, type Solution } from './board';

const solution: Solution = {
  width: 3,
  height: 2,
  cells: [true, false, true, false, true, false],
};

describe('board', () => {
  it('creates an empty board', () => {
    const board = createBoard(3, 2);
    expect(board.cells).toHaveLength(6);
    expect(board.cells.every((c) => c === Cell.Empty)).toBe(true);
  });

  it('reads rows and columns', () => {
    expect(row(solution, 1)).toEqual([false, true, false]);
    expect(column(solution, 2)).toEqual([true, false]);
    expect(getCell(solution, 0, 2)).toBe(true);
  });

  it('detects a solved board and ignores marks', () => {
    const board = createBoard(3, 2);
    expect(isSolved(board, solution)).toBe(false);
    const { Filled: F, Marked: X, Empty: _ } = Cell;
    board.cells.splice(0, 6, F, X, F, _, F, X);
    expect(isSolved(board, solution)).toBe(true);
  });

  it('rejects extra filled cells', () => {
    const board = createBoard(3, 2);
    board.cells.splice(0, 6, Cell.Filled, Cell.Filled, Cell.Filled, 0, Cell.Filled, 0);
    expect(isSolved(board, solution)).toBe(false);
  });
});
