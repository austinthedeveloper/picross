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
