import { describe, expect, it } from 'vitest';
import { parsePuzzle, slugify, stringifyPuzzle, toPuzzleFile } from './format';
import { puzzles } from './index';

const valid = { id: 't', name: 'T', width: 3, height: 2, solution: ['#.#', '.#.'] };

describe('parsePuzzle', () => {
  it('keeps a known gadget', () => {
    expect(parsePuzzle({ ...valid, gadget: 'bomb' }).gadget).toBe('bomb');
  });

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
    [{ ...valid, gadget: 'laser' }, /unknown gadget "laser"/],
  ])('rejects invalid input %#', (input, error) => {
    expect(() => parsePuzzle(input)).toThrow(error);
  });
});

describe('starter pack', () => {
  it('has square puzzles from 5x5 to 20x20', () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(10);
    for (const p of puzzles) {
      expect(p.width).toBe(p.height);
      expect(p.width).toBeGreaterThanOrEqual(5);
      expect(p.width).toBeLessThanOrEqual(20);
    }
  });

  it('is mostly big puzzles: at least half are 15x15 or larger', () => {
    const big = puzzles.filter((p) => p.width >= 15).length;
    expect(big * 2).toBeGreaterThanOrEqual(puzzles.length);
  });

  it('has unique ids', () => {
    expect(new Set(puzzles.map((p) => p.id)).size).toBe(puzzles.length);
  });
});

describe('puzzle export', () => {
  it('builds a file that parses back to the same grid', () => {
    const cells = [true, false, true, false, true, false];
    const file = toPuzzleFile('t', 'T', 3, 2, cells);
    expect(file.solution).toEqual(['#.#', '.#.']);
    const json = stringifyPuzzle(file);
    expect(json).toContain('"#.#",\n');
    expect(parsePuzzle(JSON.parse(json)).solution.cells).toEqual(cells);
  });

  it('slugifies names', () => {
    expect(slugify('  Music Note! ')).toBe('music-note');
  });
});
