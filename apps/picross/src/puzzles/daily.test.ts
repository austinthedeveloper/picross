import { describe, expect, it } from 'vitest';
import { solve } from '@picross/grid/engine/solver';
import { TRANSFORMS } from '@picross/grid/engine/transform';
import { bigPuzzles, dailyFor, dateKey, dayNumber, previousDay } from './daily';

describe('day keys', () => {
  it('use the local calendar date', () => {
    expect(dateKey(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03');
    expect(dayNumber('1970-01-02')).toBe(1);
  });

  it('step back across months and years', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
});

describe('dailyFor', () => {
  it('is the same puzzle for everyone on the same day', () => {
    expect(dailyFor('2026-11-03').puzzle.solution).toEqual(dailyFor('2026-11-03').puzzle.solution);
    expect(dailyFor('2026-11-03').puzzle.id).toBe('daily-2026-11-03');
  });

  it("doesn't repeat a puzzle and turn until the whole cycle has gone by", () => {
    const length = bigPuzzles().length * TRANSFORMS.length;
    const start = dayNumber('2026-11-03') - (dayNumber('2026-11-03') % length);
    const seen = new Set<string>();
    for (let d = 0; d < length; d++) {
      const key = dateKey(new Date(Date.UTC(1970, 0, 1 + start + d, 12)));
      const daily = dailyFor(key);
      seen.add(`${daily.base.id}/${daily.transform}`);
    }
    expect(seen.size).toBe(length);
  });

  it('only uses puzzles 15×15 or bigger, and every turn stays uniquely solvable', () => {
    for (let d = 0; d < 40; d++) {
      const { puzzle } = dailyFor(dateKey(new Date(2026, 10, 3 + d)));
      expect(Math.min(puzzle.width, puzzle.height)).toBeGreaterThanOrEqual(15);
      expect(solve(puzzle.width, puzzle.height, puzzle.clues).status).toBe('unique');
    }
  });
});
