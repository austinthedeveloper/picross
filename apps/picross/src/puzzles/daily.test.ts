import { describe, expect, it } from 'vitest';
import { solve } from '@picross/grid/engine/solver';
import { TRANSFORMS } from '@picross/grid/engine/transform';
import { dailyPuzzle, POOL } from '@picross/block/puzzles/daily';
import { cycleLength } from '@picross/block/puzzles/dailyCycle';
import { addDays, keyOfDay } from '@picross/shared/puzzles/days';
import {
  bigPuzzles,
  dailyDimension,
  dailyFor,
  dailyPick,
  dateKey,
  dayNumber,
  previousDay,
} from './daily';

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

  it('gives a Flat day the puzzle it had before the one daily (#156)', () => {
    // Worked out with dailyFor as it was before #156.
    expect(dailyDimension('2026-11-12')).toBe('grid');
    expect(dailyFor('2026-11-12')).toMatchObject({
      base: { id: 'road-roller' },
      transform: 'as drawn',
    });
    expect(dailyFor('2026-11-14')).toMatchObject({
      base: { id: 'garlic' },
      transform: 'flipped and turned a quarter',
    });
  });

  it("doesn't repeat a puzzle and turn until the whole cycle has gone by", () => {
    const length = bigPuzzles().length * TRANSFORMS.length;
    const start = dayNumber('2026-11-03') - (dayNumber('2026-11-03') % length);
    const seen = new Set<string>();
    for (let d = 0; d < length; d++) {
      const { base, turn } = dailyPick(keyOfDay(start + d));
      seen.add(`${base.id}/${turn}`);
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

describe('the one daily, the next 365 days (#156)', () => {
  const days = Array.from({ length: 365 }, (_, i) => addDays('2026-11-11', i));
  const flatDays = days.filter((day) => dailyDimension(day) === 'grid');
  const cubedDays = days.filter((day) => dailyDimension(day) === 'block');

  it('alternates Flat and Cubed', () => {
    for (let i = 1; i < days.length; i++) {
      expect(dailyDimension(days[i]), days[i]).not.toBe(dailyDimension(days[i - 1]));
    }
    expect(flatDays.length + cubedDays.length).toBe(365);
    expect(Math.abs(flatDays.length - cubedDays.length)).toBe(1);
  });

  it('repeats no Flat puzzle and turn within its cycle', () => {
    const length = bigPuzzles().length * TRANSFORMS.length;
    const seen = new Set<string>();
    for (const day of flatDays) {
      const { base, turn } = dailyPick(day);
      seen.add(`${Math.floor(dayNumber(day) / length)}/${base.id}/${turn}`);
    }
    expect(seen.size).toBe(flatDays.length);
  });

  it('repeats no Cubed puzzle and turn in any stretch as long as its pool', () => {
    // A year is 183 Cubed days; its cycle is the pool in every turn.
    expect(cycleLength(POOL.length)).toBeGreaterThan(cubedDays.length);
    const seen = new Set(
      cubedDays.map((day) => {
        const { source, turn } = dailyPuzzle(day);
        return `${source.id}/${turn.quarters}/${turn.mirror}`;
      }),
    );
    expect(seen.size).toBe(cubedDays.length);
  });

  it('never has the same block on two Cubed days running', () => {
    const ids = cubedDays.map((day) => dailyPuzzle(day).source.id);
    for (let i = 1; i < ids.length; i++) expect(ids[i], cubedDays[i]).not.toBe(ids[i - 1]);
  });
});
