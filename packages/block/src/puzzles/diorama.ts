import type { Dims } from '../engine/volume';
import { parsePuzzle, type Puzzle, type PuzzleFile } from './format';
import { chooseHidden, hashString } from './hide';
import { encodeHidden } from './format';

/**
 * Dioramas: a big scene built from tile blocks, the 3D take on the 2D game's murals. A
 * diorama file (`src/puzzles/dioramas/*.json`) is a puzzle file whose block is split into
 * tiles of `tile` size along each axis; every tile is played as its own puzzle, and solving
 * it puts that piece of the scene in place.
 */
export interface DioramaFile extends Omit<PuzzleFile, 'hide' | 'hideRatio'> {
  /** Tile size; the scene's size must be a multiple of it on every axis. */
  tile: Dims;
  /** Clues each tile hides (0 to 1). Default 0.4. */
  hideRatio?: number;
  blurb?: string;
}

export interface Tile {
  /** 0-based, in the order they're played: bottom layer first, back to front, left to right. */
  index: number;
  /** The tile's corner in scene cubes. */
  origin: { x: number; y: number; z: number };
  puzzle: Puzzle;
}

export interface Diorama {
  id: string;
  name: string;
  blurb?: string;
  /** The whole scene as one puzzle (for the finished picture). */
  scene: Puzzle;
  tiles: Tile[];
  /** Tiles along each axis. */
  grid: Dims;
}

/** Splits a diorama file into its scene and tile puzzles. Throws if it doesn't split. */
export function parseDiorama(file: DioramaFile): Diorama {
  const scene = parsePuzzle({ ...file, id: file.id });
  const { tile } = file;
  const grid = { x: scene.dims.x / tile.x, y: scene.dims.y / tile.y, z: scene.dims.z / tile.z };
  if (![grid.x, grid.y, grid.z].every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error(`Diorama ${file.id}: its size isn't a multiple of the tile size`);
  }
  const tiles: Tile[] = [];
  for (let ty = 0; ty < grid.y; ty++) {
    for (let tz = 0; tz < grid.z; tz++) {
      for (let tx = 0; tx < grid.x; tx++) {
        const origin = { x: tx * tile.x, y: ty * tile.y, z: tz * tile.z };
        const layers: string[][] = [];
        for (let y = 0; y < tile.y; y++) {
          const layer: string[] = [];
          for (let z = 0; z < tile.z; z++) {
            let row = '';
            for (let x = 0; x < tile.x; x++) {
              row += file.layers[origin.y + y][origin.z + z][origin.x + x];
            }
            layer.push(row);
          }
          layers.push(layer);
        }
        const index = tiles.length;
        const id = `${file.id}-${index + 1}`;
        const name = `${file.name}, piece ${index + 1}`;
        const plain = parsePuzzle({ id, name, colors: file.colors, layers });
        const hidden = chooseHidden(plain, file.hideRatio ?? 0.4, hashString(id));
        if (!hidden) throw new Error(`Diorama ${file.id}: piece ${index + 1} can't be solved`);
        tiles.push({
          index,
          origin,
          puzzle: parsePuzzle({
            id,
            name,
            colors: file.colors,
            layers,
            hide: encodeHidden(hidden),
          }),
        });
      }
    }
  }
  return { id: file.id, name: file.name, blurb: file.blurb, scene, tiles, grid };
}

/** Which tile a scene cube belongs to. */
export function tileOf(d: Diorama, cell: number): number {
  const { dims } = d.scene;
  const x = cell % dims.x;
  const rest = Math.floor(cell / dims.x);
  const z = rest % dims.z;
  const y = Math.floor(rest / dims.z);
  const t = d.tiles[0].puzzle.dims;
  return Math.floor(x / t.x) + d.grid.x * (Math.floor(z / t.z) + d.grid.z * Math.floor(y / t.y));
}
