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
 *
 * It also builds for real bricks (docs/bricks-real.md), which hold only by their studs.
 * Before the scan, each cube with nothing standing under it takes the best brick that
 * reaches back over something that does (the cube with the fewest such bricks first). A
 * brick with nothing under it costs a lot, and one that joins two pieces scores more. Each
 * layer is tried from all four corners, and the best few splits so far (`BEAM`) go on to
 * the next layer, ranked by their bricks' scores less what their pieces cost, so a choice
 * that only pays off a layer up can still win.
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
 * What holding together in real bricks is worth (docs/bricks-real.md): a brick with nothing
 * under it costs more than any size difference, joining two pieces is worth more than a
 * bigger brick, and joining a piece that floats to one that stands is worth more again.
 */
const REAL = { floats: 40, joins: 14, lifts: 24 } as const;
/** A layer's pieces: each one that floats, and each one at all. */
const PIECES = { floats: 60, each: 15 } as const;

/** How many splits so far go on to the next layer. */
const BEAM = 4;

/** A split of the layers so far, and what it's worth. */
interface Split {
  layers: Brick[][];
  /** Which brick of the top layer covers each (x, z), or -1, and each one's piece id. */
  below: Int32Array;
  belowBricks: Brick[];
  belowIds: number[];
  pieces: Pieces;
  /** Its bricks' scores. */
  worth: number;
  /** Its worth, less what its pieces cost. */
  rank: number;
}

/** The four corners a layer can be scanned from: [from the right, from the front]. */
const CORNERS: readonly [boolean, boolean][] = [
  [false, false],
  [true, true],
  [false, true],
  [true, false],
];

/** Which pieces the bricks so far make (they join through studs, above and below). */
class Pieces {
  private parent: number[] = [];
  private ground: boolean[] = [];
  add(onGround: boolean): number {
    this.parent.push(this.parent.length);
    this.ground.push(onGround);
    return this.parent.length - 1;
  }
  find(i: number): number {
    while (this.parent[i] !== i) i = this.parent[i] = this.parent[this.parent[i]];
    return i;
  }
  grounded(i: number) {
    return this.ground[this.find(i)];
  }
  join(a: number, b: number) {
    const [ra, rb] = [this.find(a), this.find(b)];
    if (ra === rb) return;
    this.parent[rb] = ra;
    this.ground[ra] ||= this.ground[rb];
  }
  copy(): Pieces {
    const out = new Pieces();
    out.parent = [...this.parent];
    out.ground = [...this.ground];
    return out;
  }
  /** How many pieces, and how many of them have no brick on the bottom layer. */
  count(): { pieces: number; floating: number } {
    let pieces = 0;
    let floating = 0;
    this.parent.forEach((p, i) => {
      if (p !== i) return;
      pieces++;
      if (!this.ground[i]) floating++;
    });
    return { pieces, floating };
  }
}

/**
 * The solved shape as bricks: one list per layer that has cubes, bottom first. The same
 * shape always gives the same bricks.
 */
export function splitIntoBricks(shape: Shape): Brick[][] {
  const { dims, solution } = shape;
  let beam: Split[] = [
    {
      layers: [],
      below: new Int32Array(dims.x * dims.z).fill(-1),
      belowBricks: [],
      belowIds: [],
      pieces: new Pieces(),
      worth: 0,
      rank: 0,
    },
  ];

  for (let y = 0; y < dims.y; y++) {
    const color = (x: number, z: number) => solution[indexOf(dims, { x, y, z })];

    /** One way to fill the layer on top of a split so far: greedily, from one corner. */
    const fill = (split: Split, [fromRight, fromFront]: [boolean, boolean]): Split => {
      const { below, belowBricks, belowIds, pieces } = split;
      const bottom = split.layers.length === 0;
      const owner = new Int32Array(dims.x * dims.z).fill(-1);
      const bricks: Brick[] = [];
      let value = 0;
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

      /** A brick of color `c` with its corner at (x0, z0), and what it's worth, if it fits. */
      const rate = (x0: number, z0: number, sh: (typeof SHAPES)[number], c: number) => {
        if (x0 < 0 || z0 < 0 || x0 + sh.sx > dims.x || z0 + sh.sz > dims.z) return null;
        const under = new Set<number>();
        for (let dz = 0; dz < sh.sz; dz++) {
          for (let dx = 0; dx < sh.sx; dx++) {
            const cell = x0 + dx + dims.x * (z0 + dz);
            if (owner[cell] >= 0 || color(x0 + dx, z0 + dz) !== c) return null;
            if (below[cell] >= 0) under.add(below[cell]);
          }
        }
        const one = under.size === 1 ? belowBricks[[...under][0]] : null;
        // A column only counts against a brick when the color goes on beside it, so a
        // stagger is possible: a leg stacked on a paw is fine as it is.
        const stacked =
          !!one &&
          grows(x0, z0, sh.sx, sh.sz, c) &&
          one.position.x === x0 &&
          one.position.z === z0 &&
          footprint(one.size, one.rotation).sx === sh.sx &&
          footprint(one.size, one.rotation).sz === sh.sz;
        let value = score(sh.sx * sh.sz, under.size, stacked);
        // Holding together: the pieces it rests on, and whether any of them stands.
        const roots = new Set([...under].map((u) => pieces.find(belowIds[u])));
        const standing = [...roots].filter((r) => pieces.grounded(r)).length;
        if (!bottom && !roots.size) value -= REAL.floats;
        value += Math.max(0, roots.size - 1) * REAL.joins;
        const lifts = standing > 0 && standing < roots.size;
        if (lifts) value += REAL.lifts;
        const brick: Brick = {
          size: sh.size,
          position: { x: x0, y, z: z0 },
          rotation: sh.rotation,
          color: c,
        };
        return { brick, value, standing };
      };
      const place = (brick: Brick, worth: number) => {
        for (const p of cellsOf(brick)) owner[p.x + dims.x * p.z] = bricks.length;
        bricks.push(brick);
        value += worth;
      };
      const scan = (k: number): [number, number] => [
        fromRight ? dims.x - 1 - (k % dims.x) : k % dims.x,
        fromFront ? dims.z - 1 - Math.floor(k / dims.x) : Math.floor(k / dims.x),
      ];

      // First the cubes that don't stand: with nothing under them, or on a piece that
      // floats. Each takes the best brick that reaches back over a piece that stands, from
      // any corner, the cube with the fewest such bricks first (a cube with none is left
      // for the scan, and for the layer above).
      if (!bottom) {
        for (;;) {
          let pick: { best: NonNullable<ReturnType<typeof rate>>; ways: number } | null = null;
          for (let k = 0; k < dims.x * dims.z; k++) {
            const [ax, az] = scan(k);
            const j = ax + dims.x * az;
            const c = color(ax, az);
            if (!c || owner[j] >= 0) continue;
            if (below[j] >= 0 && pieces.grounded(belowIds[below[j]])) continue;
            let best: ReturnType<typeof rate> = null;
            let ways = 0;
            for (const sh of SHAPES) {
              for (let x0 = ax - sh.sx + 1; x0 <= ax; x0++) {
                for (let z0 = az - sh.sz + 1; z0 <= az; z0++) {
                  const r = rate(x0, z0, sh, c);
                  if (!r?.standing) continue;
                  ways++;
                  if (!best || r.value > best.value) best = r;
                }
              }
            }
            if (best && (!pick || ways < pick.ways)) pick = { best, ways };
          }
          if (!pick) break;
          place(pick.best.brick, pick.best.value);
        }
      }

      // Then the rest, greedily in scan order, each from its first corner.
      for (let k = 0; k < dims.x * dims.z; k++) {
        const [ax, az] = scan(k);
        const c = color(ax, az);
        if (!c || owner[ax + dims.x * az] >= 0) continue;
        let best: ReturnType<typeof rate> = null;
        for (const sh of SHAPES) {
          // The anchor is the brick's first corner in scan order.
          const r = rate(fromRight ? ax - sh.sx + 1 : ax, fromFront ? az - sh.sz + 1 : az, sh, c);
          if (r && (!best || r.value > best.value)) best = r;
        }
        // A 1×1 always fits, so there's always a best.
        place(best!.brick, best!.value);
      }

      // The pieces once the layer is on.
      const after = pieces.copy();
      const ids = bricks.map((brick) => {
        const id = after.add(bottom);
        for (const p of cellsOf(brick)) {
          const b = below[p.x + dims.x * p.z];
          if (b >= 0) after.join(belowIds[b], id);
        }
        return id;
      });
      const { pieces: count, floating } = after.count();
      const worth = split.worth + value;
      return {
        layers: bricks.length ? [...split.layers, bricks] : split.layers,
        below: owner,
        belowBricks: bricks,
        belowIds: ids,
        pieces: bricks.length ? after : pieces,
        worth,
        rank: worth - floating * PIECES.floats - count * PIECES.each,
      };
    };

    // Each layer scans from the back left or the front right in turn, which staggers the
    // seams of plain walls on its own; another corner wins only if it holds together better,
    // here or once the layers above are on (the best few splits so far go on to the next).
    const first = y % 2 === 1 ? 1 : 0;
    const corners = [CORNERS[first], CORNERS[1 - first], CORNERS[2], CORNERS[3]];
    const next = beam.flatMap((split) => corners.map((corner) => fill(split, corner)));
    // A stable sort, so a tie keeps the first split and the usual corner.
    beam = next.sort((a, b) => b.rank - a.rank).slice(0, BEAM);
  }
  return beam[0].layers;
}
