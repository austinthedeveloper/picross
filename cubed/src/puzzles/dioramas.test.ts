import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { dioramas, parseDiorama, tileOf } from './dioramas';

describe('dioramas', () => {
  it('split a scene into tiles, each its own solvable puzzle', () => {
    const d = parseDiorama({
      id: 'mini',
      name: 'Mini',
      colors: { a: 'leaf', b: 'stone' },
      tile: { x: 2, y: 1, z: 1 },
      layers: [['aabb']],
    });
    expect(d.tiles.length).toBe(2);
    expect(d.grid).toEqual({ x: 2, y: 1, z: 1 });
    expect(tileOf(d, 3)).toBe(1);
  });

  it('refuse a scene that is not a multiple of its tile', () => {
    expect(() =>
      parseDiorama({
        id: 'x',
        name: 'X',
        colors: { a: 'red' },
        tile: { x: 2, y: 1, z: 1 },
        layers: [['aaa']],
      }),
    ).toThrow(/multiple/);
  });

  it.each(dioramas().flatMap((d) => d.tiles.map((t) => [t.puzzle.id, t] as const)))(
    '%s solves from the clues it shows',
    (_, tile) => {
      const p = tile.puzzle;
      expect(solve(p.dims, p.clues, undefined, p.lines).solved).toBe(true);
    },
  );
});
