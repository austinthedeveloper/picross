import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { dailyPuzzle, dateKey, dayBefore, POOL } from './daily';
import { cycleLength, dailyPick, TURNS } from './dailyCycle';
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
    // Cubed's days are the even ones since the epoch (#156): 2026-11-11, -13, and so on.
    const ids = new Set(
      Array.from({ length: 7 }, (_, d) => dailyPuzzle(`2026-11-${11 + 2 * d}`).source.id),
    );
    expect(ids.size).toBe(7);
  });

  it('runs through every puzzle in every turn before one comes back', () => {
    const size = POOL.length;
    const length = cycleLength(size);
    expect(length).toBe(size * TURNS.length);
    const key = (p: ReturnType<typeof dailyPick>) =>
      `${p.source}/${p.turn.quarters}/${p.turn.mirror}`;
    const picks = Array.from({ length: length + 1 }, (_, i) => dailyPick(i, size));
    expect(new Set(picks.slice(0, length).map(key)).size).toBe(length);
    // The same cycle over and over, so no stretch of `length` Cubed days has a repeat.
    expect(dailyPick(5 * length + 17, size)).toEqual(picks[17]);
    expect(dailyPick(-1, size)).toEqual(picks[length - 1]);
    // Never the same puzzle two Cubed days running, across rounds and cycles too.
    for (let i = 1; i < picks.length; i++) {
      expect(picks[i].source, `day ${i}`).not.toBe(picks[i - 1].source);
    }
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

  // Ten Cubed days (even since the epoch: December's odd dates).
  it.each(Array.from({ length: 10 }, (_, d) => `2026-12-${String(2 * d + 1).padStart(2, '0')}`))(
    '%s can be solved without guessing',
    (key) => {
      const { puzzle } = dailyPuzzle(key);
      expect(solve(puzzle.dims, puzzle.clues, undefined, puzzle.lines).solved).toBe(true);
    },
  );
});
