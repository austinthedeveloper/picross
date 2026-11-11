import { describe, expect, it } from 'vitest';
import { blockCatalog, buildCatalog, tileIdsOf } from './catalog';
import catalogFile from './catalog.json';
import { dioramaTileIds, dioramas } from './dioramas';
import { PUZZLES } from './index';

describe('the catalog', () => {
  it('matches the pack and the dioramas', () => {
    // If this fails after adding or changing puzzles, run `npm -w packages/block run puzzles`.
    expect(catalogFile).toEqual(buildCatalog(PUZZLES, dioramaTileIds()));
  });

  it('holds every free-play puzzle with its longest side', () => {
    expect(Object.keys(blockCatalog.puzzles)).toHaveLength(PUZZLES.length);
    for (const p of PUZZLES) {
      expect(blockCatalog.puzzles[p.id], p.id).toBe(Math.max(p.dims.x, p.dims.y, p.dims.z));
    }
  });

  it("names each diorama's pieces as the diorama does", () => {
    const pieces = dioramas().flatMap((d) => d.tiles.map((t) => t.puzzle.id));
    expect(new Set(blockCatalog.dioramaTiles)).toEqual(new Set(pieces));
  });

  it('counts the pieces along every axis', () => {
    const file = {
      id: 'mini',
      tile: { x: 2, y: 1, z: 1 },
      layers: [
        ['aaaa', 'aaaa'],
        ['aaaa', 'aaaa'],
      ],
    };
    expect(tileIdsOf(file)).toEqual([
      'mini-1',
      'mini-2',
      'mini-3',
      'mini-4',
      'mini-5',
      'mini-6',
      'mini-7',
      'mini-8',
    ]);
  });
});
