import { describe, expect, it } from 'vitest';
import { Cell } from '../engine/board';
import type { Move } from '../engine/history';
import { parsePuzzle } from '../puzzles/format';
import { Game } from './game';

const puzzle = parsePuzzle({ id: 't', name: 'T', width: 2, height: 1, solution: ['#.'] });

function stroke(game: Game, move: Move) {
  game.preview(move);
  game.commit(move);
}

describe('Game', () => {
  it('becomes solved when the filled cells match', () => {
    const game = new Game(puzzle);
    stroke(game, [{ index: 0, from: Cell.Empty, to: Cell.Filled }]);
    expect(game.solved).toBe(true);
    game.undo();
    expect(game.solved).toBe(false);
    game.redo();
    expect(game.solved).toBe(true);
  });

  it('resets as one undoable move', () => {
    const game = new Game(puzzle);
    stroke(game, [
      { index: 0, from: Cell.Empty, to: Cell.Filled },
      { index: 1, from: Cell.Empty, to: Cell.Marked },
    ]);
    game.reset();
    expect(game.board.cells).toEqual([Cell.Empty, Cell.Empty]);
    game.undo();
    expect(game.board.cells).toEqual([Cell.Filled, Cell.Marked]);
  });

  it('does not record no-op strokes', () => {
    const game = new Game(puzzle);
    game.commit([{ index: 0, from: Cell.Empty, to: Cell.Empty }]);
    expect(game.history.canUndo).toBe(false);
  });
});
