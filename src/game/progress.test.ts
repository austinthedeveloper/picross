import { beforeEach, describe, expect, it, vi } from 'vitest';

// progress.ts loads localStorage once at import, so each test gets a fresh module.
async function load() {
  vi.resetModules();
  return import('./progress');
}

beforeEach(() => localStorage.clear());

describe('progress', () => {
  it('tracks solves, best times, and totals', async () => {
    const progress = await load();
    expect(progress.recordSolve('a', 5000)).toBe(false); // first solve isn't a "new best"
    expect(progress.recordSolve('a', 3000)).toBe(true);
    expect(progress.recordSolve('a', 4000)).toBe(false);
    expect(progress.getPuzzleStats('a')).toEqual({ solves: 3, bestTime: 3000 });
    expect(progress.getOverallStats()).toEqual({ solved: 1, solves: 3, totalTime: 12000 });
  });

  it('saves boards and clears them on solve', async () => {
    const progress = await load();
    progress.saveBoard('a', { cells: '0120' });
    expect((await load()).getSavedBoard('a')).toEqual({ cells: '0120' });
    progress.recordSolve('a', 1000);
    expect((await load()).getSavedBoard('a')).toBeUndefined();
  });

  it('survives unreadable storage', async () => {
    localStorage.setItem('picross:v1', '{not json');
    const progress = await load();
    expect(progress.getOverallStats().solved).toBe(0);
  });
});
