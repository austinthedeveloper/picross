import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DAILY_KEY } from './daily';

async function load() {
  vi.resetModules();
  return import('./daily');
}

beforeEach(() => localStorage.clear());

describe('daily streak', () => {
  it('grows on consecutive days and survives a reload', async () => {
    const daily = await load();
    expect(daily.recordDailySolve('2026-11-01', 'grid', 100)).toBe(1);
    expect(daily.recordDailySolve('2026-11-02', 'block', 200)).toBe(2);
    expect(daily.recordDailySolve('2026-11-02', 'block', 300)).toBe(2); // same day again
    const again = await load();
    expect(again.dailyStreak('2026-11-03')).toEqual({ streak: 2, best: 2, solves: 2 });
    expect(again.isDailySolved('2026-11-02')).toBe(true);
    expect(again.isDailySolved('2026-11-03')).toBe(false);
  });

  it('counts both boards in one streak, and keeps each day and its best time (#156)', async () => {
    const daily = await load();
    daily.recordDailySolve('2026-11-11', 'block', 9_000);
    daily.recordDailySolve('2026-11-11', 'block', 7_000);
    daily.recordDailySolve('2026-11-12', 'grid', 60_000);
    expect(daily.solvedOn('2026-11-11')).toEqual({ dimension: 'block', time: 7_000 });
    expect(daily.solvedOn('2026-11-12')).toEqual({ dimension: 'grid', time: 60_000 });
    expect(JSON.parse(localStorage.getItem(DAILY_KEY)!)).toMatchObject({
      lastSolved: '2026-11-12',
      streak: 2,
      solves: 2,
    });
  });

  it('shows 0 once a day is missed, and starts over at 1', async () => {
    const daily = await load();
    daily.recordDailySolve('2026-11-01', 'grid');
    daily.recordDailySolve('2026-11-02', 'block');
    expect(daily.dailyStreak('2026-11-04').streak).toBe(0);
    expect(daily.recordDailySolve('2026-11-04', 'grid')).toBe(1);
    expect(daily.dailyStreak('2026-11-04').best).toBe(2);
  });

  it("keeps today's board on its own board, but not yesterday's", async () => {
    const daily = await load();
    daily.saveDailyBoard('2026-11-03', 'grid', { cells: '0110' });
    expect((await load()).getDailyBoard('2026-11-03', 'grid')).toEqual({ cells: '0110' });
    expect((await load()).getDailyBoard('2026-11-03', 'block')).toBeUndefined();
    expect((await load()).getDailyBoard('2026-11-04', 'grid')).toBeUndefined();
  });

  it('reads a save from step 2 of the migration', async () => {
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({
        days: { '2026-11-10': { dimension: 'grid' }, '2026-11-11': { dimension: 'block' } },
        lastSolved: '2026-11-11',
        streak: 2,
        best: 5,
        solves: 9,
      }),
    );
    const daily = await load();
    expect(daily.dailyStreak('2026-11-12')).toEqual({ streak: 2, best: 5, solves: 9 });
    expect(daily.recordDailySolve('2026-11-12', 'grid')).toBe(3);
  });
});
