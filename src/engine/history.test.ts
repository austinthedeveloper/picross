import { describe, expect, it } from 'vitest';
import { Cell, createBoard } from './board';
import { applyMove, History, type Move } from './history';

const fillFirstTwo: Move = [
  { index: 0, from: Cell.Empty, to: Cell.Filled },
  { index: 1, from: Cell.Empty, to: Cell.Filled },
];
const markThird: Move = [{ index: 2, from: Cell.Empty, to: Cell.Marked }];

function play(...moves: Move[]) {
  const board = createBoard(3, 1);
  const history = new History();
  for (const move of moves) {
    applyMove(board, move);
    history.push(move);
  }
  return { board, history };
}

describe('History', () => {
  it('undoes and redoes whole moves', () => {
    const { board, history } = play(fillFirstTwo, markThird);
    expect(history.undo(board)).toBe(true);
    expect(board.cells).toEqual([Cell.Filled, Cell.Filled, Cell.Empty]);
    expect(history.undo(board)).toBe(true);
    expect(board.cells).toEqual([Cell.Empty, Cell.Empty, Cell.Empty]);
    expect(history.undo(board)).toBe(false);

    expect(history.redo(board)).toBe(true);
    expect(history.redo(board)).toBe(true);
    expect(board.cells).toEqual([Cell.Filled, Cell.Filled, Cell.Marked]);
    expect(history.redo(board)).toBe(false);
  });

  it('clears redo after a new move', () => {
    const { board, history } = play(fillFirstTwo);
    history.undo(board);
    expect(history.canRedo).toBe(true);
    applyMove(board, markThird);
    history.push(markThird);
    expect(history.canRedo).toBe(false);
  });

  it('ignores empty moves', () => {
    const { history } = play([]);
    expect(history.canUndo).toBe(false);
  });
});
