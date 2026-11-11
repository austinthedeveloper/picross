import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { dailyPuzzle, dateKey, dayBefore } from './daily';
import { parsePuzzle, type PuzzleFile } from './format';
import { turnPuzzle } from './transform';

describe('the daily puzzle', () => {
  it('keys dates locally and steps back a day', () => {
    expect(dateKey(new Date(2026, 10, 8))).toBe('2026-11-08');
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2027-01-01')).toBe('2026-12-31');
  });

  it('is the same for a date, and different across dates', () => {
    expect(dailyPuzzle('2026-11-08').puzzle.solution).toEqual(
      dailyPuzzle('2026-11-08').puzzle.solution,
    );
    const ids = new Set(
      Array.from({ length: 14 }, (_, d) => dailyPuzzle(`2026-11-${10 + d}`).source.id),
    );
    expect(ids.size).toBeGreaterThan(3);
  });

  it('stays solvable from its clues on every turn and mirror', () => {
    const file: PuzzleFile = {
      id: 'l',
      name: 'L',
      colors: { a: 'red' },
      layers: [
        ['aa.', 'a..'],
        ['a..', '...'],
      ],
    };
    const puzzle = parsePuzzle(file);
    for (const quarters of [0, 1, 2, 3] as const) {
      for (const mirror of [false, true]) {
        const turned = parsePuzzle(turnPuzzle(file, puzzle, { quarters, mirror }));
        expect(turned.solution.filter(Boolean).length).toBe(4);
        expect(solve(turned.dims, turned.clues, undefined, turned.lines).solved).toBe(true);
      }
    }
  });

  it.each(Array.from({ length: 10 }, (_, d) => `2026-12-${String(d + 1).padStart(2, '0')}`))(
    '%s can be solved without guessing',
    (key) => {
      const { puzzle } = dailyPuzzle(key);
      expect(solve(puzzle.dims, puzzle.clues, undefined, puzzle.lines).solved).toBe(true);
    },
  );
});
