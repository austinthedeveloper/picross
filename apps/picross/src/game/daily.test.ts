import { beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return import('./daily');
}

beforeEach(() => localStorage.clear());

describe('daily streak', () => {
  it('grows on consecutive days and survives a reload', async () => {
    const daily = await load();
    expect(daily.recordDailySolve('2026-11-01', '2026-10-31')).toBe(1);
    expect(daily.recordDailySolve('2026-11-02', '2026-11-01')).toBe(2);
    expect(daily.recordDailySolve('2026-11-02', '2026-11-01')).toBe(2); // same day again
    const again = await load();
    expect(again.dailyStreak('2026-11-03', '2026-11-02')).toEqual({
      streak: 2,
      best: 2,
      solves: 2,
    });
    expect(again.isDailySolved('2026-11-02')).toBe(true);
  });

  it('shows 0 once a day is missed, and starts over at 1', async () => {
    const daily = await load();
    daily.recordDailySolve('2026-11-01', '2026-10-31');
    daily.recordDailySolve('2026-11-02', '2026-11-01');
    expect(daily.dailyStreak('2026-11-04', '2026-11-03').streak).toBe(0);
    expect(daily.recordDailySolve('2026-11-04', '2026-11-03')).toBe(1);
    expect(daily.dailyStreak('2026-11-04', '2026-11-03').best).toBe(2);
  });

  it("keeps today's board, but not yesterday's", async () => {
    const daily = await load();
    daily.saveDailyBoard('2026-11-03', { cells: '0110' });
    expect((await load()).getDailyBoard('2026-11-03')).toEqual({ cells: '0110' });
    expect((await load()).getDailyBoard('2026-11-04')).toBeUndefined();
  });
});
