import { beforeEach, describe, expect, it, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  return import('./daily');
};

describe('daily streaks', () => {
  beforeEach(() => localStorage.clear());

  it('grow day by day, and break after a missed day', async () => {
    const d = await load();
    expect(d.recordDaily('2026-11-08', 60_000)).toBe(1);
    expect(d.recordDaily('2026-11-08', 50_000)).toBe(1);
    expect(d.recordDaily('2026-11-09', 60_000)).toBe(2);
    expect(d.currentStreak('2026-11-10')).toBe(2);
    expect(d.currentStreak('2026-11-11')).toBe(0);
    expect(d.recordDaily('2026-11-12', 60_000)).toBe(1);
    expect(d.bestStreak()).toBe(2);
    expect(d.solvedOn('2026-11-08')).toEqual({ dimension: 'block', time: 50_000 });
  });

  it('are the one daily’s: a Flat day counts toward the streak (#156)', async () => {
    const d = await load();
    const one = await import('../../game/daily');
    expect(d.recordDaily('2026-11-11', 60_000)).toBe(1);
    expect(one.recordDailySolve('2026-11-12', 'grid', 90_000)).toBe(2);
    expect(d.currentStreak('2026-11-13')).toBe(2);
    expect(d.getDailyBoard('2026-11-12')).toBeUndefined();
  });

  it('keep only today’s board', async () => {
    const d = await load();
    d.saveDailyBoard('2026-11-08', { blocks: '012' });
    expect(d.getDailyBoard('2026-11-08')).toMatchObject({ blocks: '012' });
    expect(d.getDailyBoard('2026-11-09')).toBeUndefined();
  });
});
