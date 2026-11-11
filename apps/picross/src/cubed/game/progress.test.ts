import { beforeEach, describe, expect, it, vi } from 'vitest';

// progress.ts reads storage once at import, so each test re-imports it after seeding.
const load = async (saved?: object) => {
  localStorage.clear();
  if (saved) localStorage.setItem('picross3d:v1', JSON.stringify(saved));
  vi.resetModules();
  return import('./progress');
};

describe('progress', () => {
  beforeEach(() => localStorage.clear());

  it('records solves, best times and total time', async () => {
    const p = await load();
    expect(p.recordSolve('mug', 60_000)).toBe(false);
    expect(p.recordSolve('mug', 50_000)).toBe(true);
    expect(p.recordSolve('mug', 70_000)).toBe(false);
    expect(p.getPuzzleStats('mug')).toEqual({ solves: 3, bestTime: 50_000, clean: 3 });
    expect(p.getOverallStats()).toEqual({ solved: 1, solves: 3, totalTime: 180_000 });
  });

  it("doesn't treat an old 0:00 best as a best", async () => {
    const p = await load({ solved: { mug: { solves: 1, bestTime: 0 } }, boards: {}, totalTime: 0 });
    expect(p.recordSolve('mug', 90_000)).toBe(false);
    expect(p.getPuzzleStats('mug')?.bestTime).toBe(90_000);
  });

  it('clears the saved board on a solve', async () => {
    const p = await load();
    p.saveBoard('mug', { blocks: '0120' });
    p.recordSolve('mug', 1000);
    expect(p.getSavedBoard('mug')).toBeUndefined();
  });
});
