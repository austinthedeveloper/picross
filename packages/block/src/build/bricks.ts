/**
 * Splitting a solved block into toy bricks, layer by layer from the bottom (the build phase,
 * after the 2D and 3D puzzles). Nothing here is written by hand: any shape gets a build.
 *
 * Each layer is one cube tall. Bricks are one color and only cover cubes of that color. A
 * layer is filled greedily: take the first cube not yet covered (in scan order), try every
 * brick that could start there, and keep the best by `score`. Bigger bricks score more, and
 * so do bricks that rest on two or more bricks of the layer below (they cross its seams, so
 * the build reads like real stacking), and a brick sitting exactly on one just like it
 * counts about half when the color carries on beside it. Odd layers scan from the opposite
 * corner, which staggers the seams of plain walls on its own.
 */
import { indexOf, type Dims, type Point } from '../engine/volume';

export type BrickSize = '2x4' | '2x2' | '1x4' | '1x2' | '1x1';

/** The brick set, biggest first: `w` is the short side, `d` the long one, in cubes. */
export const BRICK_SIZES: readonly { size: BrickSize; w: number; d: number }[] = [
  { size: '2x4', w: 2, d: 4 },
  { size: '2x2', w: 2, d: 2 },
  { size: '1x4', w: 1, d: 4 },
  { size: '1x2', w: 1, d: 2 },
  { size: '1x1', w: 1, d: 1 },
];

/** 0: the long side runs back to front (along z). 90: left to right (along x). */
export type Rotation = 0 | 90;

export interface Brick {
  size: BrickSize;
  /** The corner with the lowest x and z; `y` is its layer. */
  position: Point;
  rotation: Rotation;
  /** As in `Puzzle.solution`: 1 + an index into the puzzle's palette. */
  color: number;
}

/** What the split needs of a puzzle. */
export interface Shape {
  dims: Dims;
  solution: ArrayLike<number>;
}

const sizeOf = (size: BrickSize) => BRICK_SIZES.find((s) => s.size === size)!;

/** Square bricks look the same either way round, so they're always at 0. */
export const isSquare = (size: BrickSize) => sizeOf(size).w === sizeOf(size).d;

/** How many cubes a brick spans along x and z. */
export function footprint(size: BrickSize, rotation: Rotation): { sx: number; sz: number } {
  const { w, d } = sizeOf(size);
  return rotation === 0 ? { sx: w, sz: d } : { sx: d, sz: w };
}

/** The cubes a brick covers. */
export function cellsOf(brick: Brick): Point[] {
  const { sx, sz } = footprint(brick.size, brick.rotation);
  const out: Point[] = [];
  for (let dz = 0; dz < sz; dz++) {
    for (let dx = 0; dx < sx; dx++) {
      out.push({ x: brick.position.x + dx, y: brick.position.y, z: brick.position.z + dz });
    }
  }
  return out;
}

/** Every way a brick can lie: each size, each rotation that differs. Biggest first. */
const SHAPES = BRICK_SIZES.flatMap(({ size, w, d }) =>
  (w === d ? [0] : [0, 90]).map((rotation) => ({
    size,
    rotation: rotation as Rotation,
    ...footprint(size, rotation as Rotation),
  })),
);

/**
 * How good a brick is here. `restsOn` is how many different bricks of the layer below it
 * sits on, and `stacked` whether it sits exactly on one brick of its own footprint (a
 * column, which a real build avoids: it counts about half, so a smaller brick that starts a
 * stagger wins).
 */
export function score(area: number, restsOn: number, stacked: boolean): number {
  return area * 4 + Math.max(0, restsOn - 1) * 3 - (stacked ? area * 2 + 2 : 0);
}

/**
 * The solved shape as bricks: one list per layer that has cubes, bottom first. The same
 * shape always gives the same bricks.
 */
export function splitIntoBricks(shape: Shape): Brick[][] {
  const { dims, solution } = shape;
  const layers: Brick[][] = [];
  // Which brick of the layer below covers each (x, z), or -1.
  let below = new Int32Array(dims.x * dims.z).fill(-1);
  let belowBricks: Brick[] = [];

  for (let y = 0; y < dims.y; y++) {
    const color = (x: number, z: number) => solution[indexOf(dims, { x, y, z })];
    const owner = new Int32Array(dims.x * dims.z).fill(-1);
    const bricks: Brick[] = [];
    const flip = y % 2 === 1;
    /** Whether an uncovered cube of color `c` touches the side of this footprint. */
    const grows = (x0: number, z0: number, sx: number, sz: number, c: number) => {
      const open = (x: number, z: number) =>
        x >= 0 &&
        z >= 0 &&
        x < dims.x &&
        z < dims.z &&
        owner[x + dims.x * z] < 0 &&
        color(x, z) === c;
      for (let dx = 0; dx < sx; dx++)
        if (open(x0 + dx, z0 - 1) || open(x0 + dx, z0 + sz)) return true;
      for (let dz = 0; dz < sz; dz++)
        if (open(x0 - 1, z0 + dz) || open(x0 + sx, z0 + dz)) return true;
      return false;
    };

    for (let k = 0; k < dims.x * dims.z; k++) {
      // Scan from the back left on even layers, from the front right on odd ones.
      const j = flip ? dims.x * dims.z - 1 - k : k;
      const ax = j % dims.x;
      const az = Math.floor(j / dims.x);
      const c = color(ax, az);
      if (!c || owner[j] >= 0) continue;

      let best: { brick: Brick; score: number } | null = null;
      for (const s of SHAPES) {
        // The anchor is the brick's first corner in scan order.
        const x0 = flip ? ax - s.sx + 1 : ax;
        const z0 = flip ? az - s.sz + 1 : az;
        if (x0 < 0 || z0 < 0 || x0 + s.sx > dims.x || z0 + s.sz > dims.z) continue;
        let fits = true;
        const under = new Set<number>();
        for (let dz = 0; dz < s.sz && fits; dz++) {
          for (let dx = 0; dx < s.sx && fits; dx++) {
            const cell = x0 + dx + dims.x * (z0 + dz);
            if (owner[cell] >= 0 || color(x0 + dx, z0 + dz) !== c) fits = false;
            else if (below[cell] >= 0) under.add(below[cell]);
          }
        }
        if (!fits) continue;
        const one = under.size === 1 ? belowBricks[[...under][0]] : null;
        // A column only counts against a brick when the color goes on beside it, so a
        // stagger is possible: a leg stacked on a paw is fine as it is.
        const stacked =
          !!one &&
          grows(x0, z0, s.sx, s.sz, c) &&
          one.position.x === x0 &&
          one.position.z === z0 &&
          footprint(one.size, one.rotation).sx === s.sx &&
          footprint(one.size, one.rotation).sz === s.sz;
        const value = score(s.sx * s.sz, under.size, stacked);
        if (!best || value > best.score) {
          best = {
            brick: { size: s.size, position: { x: x0, y, z: z0 }, rotation: s.rotation, color: c },
            score: value,
          };
        }
      }
      // A 1×1 always fits, so there's always a best.
      const brick = best!.brick;
      for (const p of cellsOf(brick)) owner[p.x + dims.x * p.z] = bricks.length;
      bricks.push(brick);
    }

    if (bricks.length) layers.push(bricks);
    below = owner;
    belowBricks = bricks;
  }
  return layers;
}
