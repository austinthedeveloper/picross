import { describe, expect, it } from 'vitest';
import { parsePuzzle } from '../puzzles/format';
import { BROKEN, Game, MAX_HINTS, PAINTED, SOLID } from './game';

// Steps: a full bottom layer, two rows on the middle layer, one row on top.
const puzzle = parsePuzzle({
  id: 'test',
  name: 'Test',
  colors: { s: 'stone' },
  layers: [
    ['ss', 'ss'],
    ['ss', '..'],
  ],
});
// Cubes: bottom layer 0-3, top layer 4-7; the top front row (6, 7) isn't the shape.

describe('Game', () => {
  it('is solved once everything that is not the shape is broken', () => {
    const game = new Game(puzzle, 'relaxed');
    expect(game.begin('break', 6, 'y')).toBe('broke');
    expect(game.extend(7)).toBe('broke');
    game.end();
    expect(game.solved).toBe(true);
  });

  it('keeps a stroke to the layer it started on', () => {
    const game = new Game(puzzle, 'relaxed');
    game.begin('break', 6, 'z');
    // 4 is behind 6 (same x and y, z 0): another layer seen from the front.
    expect(game.extend(4)).toBe('none');
    expect(game.extend(7)).toBe('broke');
  });

  it('protects painted cubes, and paint strokes unpaint what they start on', () => {
    const game = new Game(puzzle, 'relaxed');
    game.begin('paint', 0, 'y');
    game.extend(1);
    game.end();
    expect([game.blocks[0], game.blocks[1]]).toEqual([PAINTED, PAINTED]);
    expect(game.begin('break', 0, 'y')).toBe('none');
    game.end();
    expect(game.begin('paint', 0, 'y')).toBe('unpainted');
    game.end();
    expect(game.blocks[0]).toBe(SOLID);
  });

  it('undoes and redoes whole strokes', () => {
    const game = new Game(puzzle, 'relaxed');
    game.begin('paint', 0, 'y');
    game.extend(1);
    game.end();
    game.undo();
    expect([game.blocks[0], game.blocks[1]]).toEqual([SOLID, SOLID]);
    game.redo();
    expect(game.blocks[1]).toBe(PAINTED);
  });

  it('costs a heart in hearts mode, and paints the cube instead', () => {
    const game = new Game(puzzle, 'hearts');
    expect(game.begin('break', 0, 'y')).toBe('strike');
    expect(game.blocks[0]).toBe(PAINTED);
    expect(game.hearts).toBe(2);
    game.begin('break', 1, 'y');
    game.begin('break', 2, 'y');
    expect(game.failed).toBe(true);
    expect(game.begin('break', 6, 'y')).toBe('none');
  });

  it('lets relaxed break the shape, and a check puts it back', () => {
    const game = new Game(puzzle, 'relaxed');
    game.begin('break', 0, 'y');
    game.end();
    expect(game.mistakes).toEqual([0]);
    expect(game.check()).toEqual([0]);
    expect(game.blocks[0]).toBe(PAINTED);
    expect(game.hintsLeft).toBe(MAX_HINTS - 1);
    // A clean board still costs the hint, and finds nothing.
    expect(game.check()).toEqual([]);
    expect(game.hintsLeft).toBe(MAX_HINTS - 2);
  });

  it("gives hints from what's right on the board, ignoring mistakes", () => {
    const game = new Game(puzzle, 'relaxed');
    game.begin('break', 0, 'y');
    game.end();
    const hint = game.hint()!;
    for (const { index, to } of hint.move) {
      expect(to === PAINTED).toBe(puzzle.solution[index] !== 0);
    }
  });

  it('gives hints that move toward the answer, up to the limit', () => {
    const game = new Game(puzzle, 'relaxed');
    for (let n = 0; n < MAX_HINTS; n++) {
      const hint = game.hint();
      if (!hint) break;
      for (const { index, to } of hint.move) {
        expect(to === PAINTED).toBe(puzzle.solution[index] !== 0);
      }
    }
    expect(game.hint()).toBeNull();
  });

  it('saves and restores', () => {
    const game = new Game(puzzle, 'hearts');
    game.begin('break', 6, 'y');
    game.end();
    game.elapsed = 1234;
    const again = new Game(puzzle, 'relaxed', game.save());
    expect(again.blocks[6]).toBe(BROKEN);
    expect(again.mode).toBe('hearts');
    expect(again.elapsed).toBe(1234);
  });
});
