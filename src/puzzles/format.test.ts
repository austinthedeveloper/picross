import { describe, expect, it } from 'vitest';
import { parsePuzzle } from './format';
import { puzzles } from './index';

const valid = { id: 't', name: 'T', width: 3, height: 2, solution: ['#.#', '.#.'] };

describe('parsePuzzle', () => {
  it('parses a valid puzzle and derives clues', () => {
    const p = parsePuzzle(valid);
    expect(p.solution.cells).toEqual([true, false, true, false, true, false]);
    expect(p.clues.rows).toEqual([[1, 1], [1]]);
    expect(p.clues.cols).toEqual([[1], [1], [1]]);
  });

  it.each([
    [{ ...valid, id: '' }, /missing id/],
    [{ ...valid, width: 0 }, /width/],
    [{ ...valid, solution: ['#.#'] }, /2 rows/],
    [{ ...valid, solution: ['#.#', '.#'] }, /row 1 must be 3/],
    [{ ...valid, solution: ['#x#', '.#.'] }, /invalid character/],
    [{ ...valid, solution: ['...', '...'] }, /empty/],
  ])('rejects invalid input %#', (input, error) => {
    expect(() => parsePuzzle(input)).toThrow(error);
  });
});

describe('starter pack', () => {
  it('has 10 to 15 puzzles from 5x5 to 15x15', () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(10);
    expect(puzzles.length).toBeLessThanOrEqual(15);
    for (const p of puzzles) {
      expect(Math.min(p.width, p.height)).toBeGreaterThanOrEqual(5);
      expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(15);
    }
  });

  it('has unique ids', () => {
    expect(new Set(puzzles.map((p) => p.id)).size).toBe(puzzles.length);
  });
});
