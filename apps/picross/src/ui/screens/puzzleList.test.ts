import { describe, expect, it } from 'vitest';
import { puzzles } from '@picross/grid/puzzles/index';
import { SIZE_BANDS } from '../../game/freePlay';
import { unsolvedPuzzles, type ListView } from './puzzleList';

const view = (patch: Partial<ListView> = {}): ListView => ({
  filter: 'all',
  order: 'asc',
  difficulty: 'any',
  size: 'any',
  ...patch,
});

// Free play's Flat tab (#153): every puzzle is reachable, and the size bands split the pack.
describe('the Flat list', () => {
  it('offers the whole pack, in list order', () => {
    expect(unsolvedPuzzles(view()).map((c) => c.href)).toEqual(
      puzzles.map((p) => `#/play/${p.id}`),
    );
  });

  it('splits the pack between the size bands, each band non-empty', () => {
    const counts = SIZE_BANDS.map((b) => unsolvedPuzzles(view({ size: b.id })).length);
    expect(counts.every((n) => n > 0)).toBe(true);
    expect(counts.reduce((a, b) => a + b)).toBe(puzzles.length);
  });

  it('runs largest first when asked', () => {
    expect(unsolvedPuzzles(view({ order: 'desc' }))[0].href).toBe(`#/play/${puzzles.at(-1)!.id}`);
  });

  it('keeps to a difficulty, and rates by band', () => {
    const insane = unsolvedPuzzles(view({ difficulty: 'insane' }));
    expect(insane.length).toBeGreaterThan(0);
    expect(insane.every((c) => c.band === 4)).toBe(true);
  });
});
