import { beforeEach, describe, expect, it, vi } from 'vitest';

// progress.ts reads storage once at import, so each test re-imports it after seeding. Cubed's
// free play is the `block:` side of the one save (#155).
const load = async (saved?: object) => {
  localStorage.clear();
  if (saved) localStorage.setItem('picross:v2', JSON.stringify(saved));
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
    const p = await load({
      solved: { 'block:mug': { solves: 1, bestTime: 0 } },
      boards: {},
      time: {},
    });
    expect(p.recordSolve('mug', 90_000)).toBe(false);
    expect(p.getPuzzleStats('mug')).toEqual({ solves: 2, bestTime: 90_000, clean: 1 });
  });

  it("keeps Cubed's puzzles apart from the 2D game's of the same id", async () => {
    const p = await load();
    const flat = await import('../../game/progress');
    p.recordSolve('mug', 1000, 1);
    p.saveBoard('cactus', { blocks: '01' });
    expect(flat.getPuzzleStats('mug')).toBeUndefined();
    expect(flat.getSavedBoard('cactus')).toBeUndefined();
    expect(p.getPuzzleStats('mug')).toEqual({ solves: 1, bestTime: 1000, clean: 0 });
    expect(p.solvedIds()).toEqual(['mug']);
    expect(p.cleanSolves()).toBe(0);
    flat.recordSolve('mug', 5000);
    expect(flat.getOverallStats()).toEqual({ solved: 1, solves: 1, totalTime: 5000 });
    expect(p.getOverallStats()).toEqual({ solved: 1, solves: 1, totalTime: 1000 });
    expect(Object.keys(JSON.parse(localStorage.getItem('picross:v2')!).solved).sort()).toEqual([
      'block:mug',
      'grid:mug',
    ]);
  });

  it('counts editor play-tests', async () => {
    const p = await load();
    p.recordPlaytest();
    expect((await load({ ...JSON.parse(localStorage.getItem('picross:v2')!) })).playtests()).toBe(
      1,
    );
  });

  it('clears the saved board on a solve', async () => {
    const p = await load();
    p.saveBoard('mug', { blocks: '0120' });
    p.recordSolve('mug', 1000);
    expect(p.getSavedBoard('mug')).toBeUndefined();
  });
});
