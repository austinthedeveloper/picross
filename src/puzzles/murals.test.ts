import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { murals, parseMural } from './murals';

const rows = (w: number, h: number) =>
  Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => ((r + c) % 3 ? '#' : '.')).join(''),
  );

describe('parseMural', () => {
  it('splits the picture into tiles, row by row', () => {
    const mural = parseMural({ id: 'm', name: 'M', order: 1, tile: 5, solution: rows(10, 5) });
    expect([mural.across, mural.down]).toEqual([2, 1]);
    expect(mural.tiles.map((t) => t.id)).toEqual(['m-1', 'm-2']);
    expect(mural.tiles[1].solution.cells[0]).toBe(mural.solution.cells[5]);
  });

  it.each([
    [{ name: 'M', order: 1, tile: 5, solution: rows(10, 5) }, /missing id/],
    [{ id: 'm', name: 'M', order: 1, tile: 5, solution: rows(12, 5) }, /doesn't split/],
    [{ id: 'm', name: 'M', order: 1, tile: 5, solution: rows(5, 5) }, /at least two tiles/],
    [{ id: 'm', name: 'M', order: 1, tile: 3, solution: rows(6, 3) }, /tile must be/],
  ])('rejects %j', (data, error) => {
    expect(() => parseMural(data)).toThrow(error);
  });
});

describe('bundled murals', () => {
  const tiles = murals.flatMap((m) => m.tiles.map((t) => [t.id, t] as const));
  it.each(tiles)('%s is uniquely solvable on its own', (_, tile) => {
    expect(solve(tile.width, tile.height, tile.clues).status).toBe('unique');
  });

  it('tile ids never clash with puzzle ids', async () => {
    const { puzzles } = await import('./index');
    const ids = new Set(puzzles.map((p) => p.id));
    expect(tiles.filter(([id]) => ids.has(id))).toEqual([]);
  });
});
