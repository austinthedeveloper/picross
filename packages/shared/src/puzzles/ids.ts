/**
 * Puzzle ids with a dimension (#147). Both packs have a `mug`, so where the two games meet
 * (one list, one save, one daily) an id says which game it's from: `grid:mug` is the 2D
 * puzzle, `block:mug` the 3D one.
 *
 * Content files keep their bare ids (`"id": "mug"`); the prefix is added where a pack's
 * puzzles meet the other's. Saves keep bare ids too, until the save merge (#155).
 */

/** Which game a puzzle is from: `grid` is the 2D game's, `block` Picross Cubed's. */
export type Dimension = 'grid' | 'block';

export const DIMENSIONS: readonly Dimension[] = ['grid', 'block'];

/** A puzzle id with its dimension: `grid:mug`, `block:mug`. */
export type QualifiedId = `${Dimension}:${string}`;

const isDimension = (value: string): value is Dimension =>
  (DIMENSIONS as readonly string[]).includes(value);

/** Throws unless `id` is a bare puzzle id: not empty, and without the `:` a prefix uses. */
function checkBare(id: string, what: string): void {
  if (!id) throw new Error(`${what}: the puzzle id is empty`);
  if (id.includes(':')) throw new Error(`${what}: "${id}" isn't a bare puzzle id`);
}

/** The qualified id of puzzle `id` from `dimension`: `qualify('grid', 'mug')` is `grid:mug`. */
export function qualify(dimension: Dimension, id: string): QualifiedId {
  if (!isDimension(dimension)) throw new Error(`Unknown puzzle dimension "${dimension}"`);
  checkBare(id, 'qualify');
  return `${dimension}:${id}`;
}

/**
 * The dimension and bare id of a qualified id: `parseId('grid:mug')` is
 * `{ dimension: 'grid', id: 'mug' }`.
 *
 * A bare id (`mug`) throws, as does an unknown dimension or an empty id: at the places that
 * read qualified ids, a missing prefix is the bug this helper exists to catch, so it doesn't
 * guess a dimension. Code holding a bare id knows its game and calls `qualify`.
 */
export function parseId(qualified: string): { dimension: Dimension; id: string } {
  const colon = qualified.indexOf(':');
  if (colon < 0) throw new Error(`"${qualified}" has no dimension (grid: or block:)`);
  const dimension = qualified.slice(0, colon);
  if (!isDimension(dimension)) {
    throw new Error(`"${qualified}" has an unknown dimension "${dimension}"`);
  }
  const id = qualified.slice(colon + 1);
  checkBare(id, `"${qualified}"`);
  return { dimension, id };
}
