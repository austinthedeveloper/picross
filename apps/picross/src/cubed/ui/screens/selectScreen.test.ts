import { describe, expect, it } from 'vitest';
import { PUZZLES } from '@picross/block/puzzles/index';
import { SIZE_BANDS } from '../../../game/freePlay';
import { updateSettings } from '../../../game/settings';
import { unsolvedPuzzles } from './selectScreen';

// Free play's Cubed tab (#153): every block is reachable, and the size bands split the pack.
describe("Cubed's list", () => {
  it('offers the whole pack, in list order', () => {
    expect(unsolvedPuzzles('any').map((c) => c.href)).toEqual(
      PUZZLES.map((p) => `#/cubed/play/${p.id}`),
    );
  });

  it('splits the pack between the size bands, each band non-empty', () => {
    const counts = SIZE_BANDS.map((b) => unsolvedPuzzles(b.id).length);
    expect(counts.every((n) => n > 0)).toBe(true);
    expect(counts.reduce((a, b) => a + b)).toBe(PUZZLES.length);
  });

  it("shows Flat's insane as its hardest band", () => {
    updateSettings({ listDifficulty: 'insane' });
    const picks = unsolvedPuzzles('any');
    updateSettings({ listDifficulty: 'any' });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((c) => c.band === 3)).toBe(true);
  });
});
