import { lineIdAt, pointOf, type Axis, type Dims, type Point } from '../engine/volume';
import { encodeHidden, type Puzzle, type PuzzleFile } from './format';

/**
 * The eight ways to set a block down differently: a quarter turn about the vertical axis
 * (0 to 3), and whether it's mirrored left to right. Clues stay true (a line read
 * backwards has the same count and pieces), so a puzzle's hidden clues carry over.
 */
export interface Turn {
  quarters: 0 | 1 | 2 | 3;
  mirror: boolean;
}

export function turnedDims(d: Dims, t: Turn): Dims {
  return t.quarters % 2 ? { x: d.z, y: d.y, z: d.x } : { ...d };
}

/** Where a cube of the turned block came from in the original. */
export function sourceOf(d: Dims, t: Turn, p: Point): Point {
  const nd = turnedDims(d, t);
  const x = t.mirror ? nd.x - 1 - p.x : p.x;
  const { y, z } = p;
  switch (t.quarters) {
    case 1:
      return { x: z, y, z: d.z - 1 - x };
    case 2:
      return { x: d.x - 1 - x, y, z: d.z - 1 - z };
    case 3:
      return { x: d.x - 1 - z, y, z: x };
    default:
      return { x, y, z };
  }
}

/** The axis in the original that a turned block's axis came from. */
const sourceAxis = (t: Turn, axis: Axis): Axis =>
  t.quarters % 2 && axis !== 'y' ? (axis === 'x' ? 'z' : 'x') : axis;

/** A puzzle file for the turned block, keeping which clues are hidden. */
export function turnPuzzle(file: PuzzleFile, puzzle: Puzzle, t: Turn): PuzzleFile {
  const d = puzzle.dims;
  const nd = turnedDims(d, t);
  const layers: string[][] = [];
  for (let y = 0; y < nd.y; y++) {
    const layer: string[] = [];
    for (let z = 0; z < nd.z; z++) {
      let row = '';
      for (let x = 0; x < nd.x; x++) {
        const s = sourceOf(d, t, { x, y, z });
        row += file.layers[s.y][s.z][s.x];
      }
      layer.push(row);
    }
    layers.push(layer);
  }
  // Each line of the turned block is a line of the original: carry its hidden flag over.
  const hidden: boolean[] = [];
  for (let i = 0; i < nd.x * nd.y * nd.z; i++) {
    const p = pointOf(nd, i);
    const s = sourceOf(d, t, p);
    for (const axis of ['x', 'y', 'z'] as const) {
      hidden[lineIdAt(nd, axis, p)] = puzzle.clues[lineIdAt(d, sourceAxis(t, axis), s)] === null;
    }
  }
  return { ...file, layers, hide: encodeHidden(hidden) };
}
