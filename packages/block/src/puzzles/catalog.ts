import type { Dims } from '../engine/volume';
import catalog from './catalog.json';

/**
 * What the one app needs to know about the 3D pack without loading it (#157): free-play
 * rank and the badges count Cubed's solves on the 2D game's screens, and the pack itself
 * (every block's layers and clues) stays out of the first download. `npm run puzzles`
 * writes `catalog.json`, and `catalog.test.ts` checks it matches the pack.
 */
export interface BlockCatalog {
  /** Each free-play puzzle's id and the longest side of its block. */
  puzzles: Record<string, number>;
  /** Every diorama piece's puzzle id. */
  dioramaTiles: string[];
}

export const blockCatalog: BlockCatalog = catalog;

/** The puzzle ids of a diorama's pieces, `park-1` on, without splitting it. */
export function tileIdsOf(file: { id: string; tile: Dims; layers: string[][] }): string[] {
  const n =
    (file.layers[0][0].length / file.tile.x) *
    (file.layers.length / file.tile.y) *
    (file.layers[0].length / file.tile.z);
  return Array.from({ length: n }, (_, i) => `${file.id}-${i + 1}`);
}

/** The catalog of a pack: ids in order, so the file only changes when the pack does. */
export function buildCatalog(
  puzzles: readonly { id: string; dims: Dims }[],
  dioramaTiles: readonly string[],
): BlockCatalog {
  const sorted = [...puzzles].sort((a, b) => a.id.localeCompare(b.id));
  return {
    puzzles: Object.fromEntries(sorted.map((p) => [p.id, Math.max(p.dims.x, p.dims.y, p.dims.z)])),
    dioramaTiles: [...dioramaTiles].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
  };
}
