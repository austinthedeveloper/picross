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

  it('stops the clock once solved', () => {
    const game = new Game(puzzle);
    game.tick(1000);
    stroke(game, [{ index: 0, from: Cell.Empty, to: Cell.Filled }]);
    game.tick(1000);
    expect(game.elapsed).toBe(1000);
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

describe('Game save/restore', () => {
  it('round-trips a board', () => {
    const game = new Game(puzzle);
    stroke(game, [{ index: 1, from: Cell.Empty, to: Cell.Marked }]);
    game.tick(1500);
    const restored = new Game(puzzle, game.serialize());
    expect(restored.board.cells).toEqual([Cell.Empty, Cell.Marked]);
    expect(restored.elapsed).toBe(1500);
    expect(restored.started).toBe(true);
  });

  it('ignores a save of the wrong size', () => {
    const restored = new Game(puzzle, { cells: '111' });
    expect(restored.started).toBe(false);
  });
});

describe('hearts mode', () => {
  const fill = (index: number) => [{ index, from: Cell.Empty, to: Cell.Filled }];

  it('turns a wrong fill into a mark and costs a heart', () => {
    const game = new Game(puzzle, undefined, 'hearts');
    const result = game.preview(fill(1));
    expect(result.mistake).toMatchObject({ index: 1, to: Cell.Marked });
    expect(game.board.cells[1]).toBe(Cell.Marked);
    expect(game.hearts).toBe(2);
  });

  it('stops applying a stroke at the first mistake', () => {
    const wide = parsePuzzle({ id: 'w', name: 'W', width: 3, height: 1, solution: ['#..'] });
    const game = new Game(wide, undefined, 'hearts');
    const result = game.preview([...fill(0), ...fill(1), ...fill(2)]);
    expect(result.applied).toHaveLength(2);
    expect(game.board.cells).toEqual([Cell.Filled, Cell.Marked, Cell.Empty]);
  });

  it('fails at zero hearts and can retry', () => {
    const wide = parsePuzzle({ id: 'w', name: 'W', width: 4, height: 1, solution: ['#...'] });
    const game = new Game(wide, undefined, 'hearts');
    for (const i of [1, 2, 3]) game.preview(fill(i));
    expect(game.failed).toBe(true);
    game.retry();
    expect(game.failed).toBe(false);
    expect(game.started).toBe(false);
  });

  it('never checks fills in relaxed mode', () => {
    const game = new Game(puzzle);
    expect(game.preview(fill(1)).mistake).toBeNull();
    expect(game.board.cells[1]).toBe(Cell.Filled);
  });

  it('keeps the saved mode and hearts', () => {
    const game = new Game(puzzle, undefined, 'hearts');
    game.preview(fill(1));
    const restored = new Game(puzzle, game.serialize(), 'relaxed');
    expect(restored.mode).toBe('hearts');
    expect(restored.hearts).toBe(2);
  });
});

describe('hints', () => {
  const grid = parsePuzzle({ id: 'g', name: 'G', width: 3, height: 2, solution: ['#.#', '.#.'] });

  it('reveals a row as fills and marks and costs one hint', () => {
    const game = new Game(grid);
    const changes = game.hint('row', 0, 1);
    expect(changes).toHaveLength(3);
    expect(game.board.cells.slice(0, 3)).toEqual([Cell.Filled, Cell.Marked, Cell.Filled]);
    expect(game.hintsLeft).toBe(2);
    game.undo();
    expect(game.started).toBe(false);
    expect(game.hintsLeft).toBe(2);
  });

  it('is free when the target is already correct', () => {
    const game = new Game(grid);
    game.hint('cell', 1, 1);
    expect(game.hint('cell', 1, 1)).toEqual([]);
    expect(game.hintsLeft).toBe(2);
  });

  it('stops at the limit and can solve the puzzle', () => {
    const game = new Game(grid);
    game.hint('row', 0, 0);
    game.hint('row', 1, 0);
    expect(game.solved).toBe(true);
    const other = new Game(grid);
    for (const c of [0, 1, 2]) other.hint('col', 0, c);
    expect(other.hintsLeft).toBe(0);
    expect(other.hint('cell', 0, 0)).toEqual([]);
  });

  it('saves hints used', () => {
    const game = new Game(grid);
    game.hint('cell', 0, 0);
    expect(new Game(grid, game.serialize()).hintsUsed).toBe(1);
  });
});

describe('battle mode', () => {
  it('reports wrong fills as mistakes without hearts or failing', () => {
    const wide = parsePuzzle({ id: 'w', name: 'W', width: 4, height: 1, solution: ['#...'] });
    const game = new Game(wide, undefined, 'battle');
    for (const i of [1, 2, 3]) {
      expect(game.preview([{ index: i, from: Cell.Empty, to: Cell.Filled }]).mistake).toBeTruthy();
    }
    expect(game.board.cells.slice(1)).toEqual([Cell.Marked, Cell.Marked, Cell.Marked]);
    expect(game.hearts).toBe(3);
    expect(game.failed).toBe(false);
  });
});

describe('wipe', () => {
  it('clears cells and starts the undo history over', () => {
    const tall = parsePuzzle({ id: 't2', name: 'T', width: 2, height: 2, solution: ['#.', '.#'] });
    const game = new Game(tall);
    stroke(game, [{ index: 0, from: Cell.Empty, to: Cell.Filled }]);
    game.wipe([0]);
    expect(game.board.cells).toEqual([Cell.Empty, Cell.Empty, Cell.Empty, Cell.Empty]);
    expect(game.history.canUndo).toBe(false);
  });
});
