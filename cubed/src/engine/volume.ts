/**
 * The block: a box of `x` × `y` × `z` cubes. `x` runs left to right, `y` bottom to top and
 * `z` back to front. Cubes are numbered layer by layer from the bottom, each layer row by
 * row from the back, so `index = x + width * (z + depth * y)`.
 */
export interface Dims {
  x: number;
  y: number;
  z: number;
}

export type Axis = 'x' | 'y' | 'z';
export const AXES: readonly Axis[] = ['x', 'y', 'z'];

export interface Point {
  x: number;
  y: number;
  z: number;
}

export const volume = (d: Dims) => d.x * d.y * d.z;

export const indexOf = (d: Dims, p: Point) => p.x + d.x * (p.z + d.z * p.y);

export function pointOf(d: Dims, i: number): Point {
  const x = i % d.x;
  const rest = Math.floor(i / d.x);
  return { x, z: rest % d.z, y: Math.floor(rest / d.z) };
}

export const inside = (d: Dims, p: Point) =>
  p.x >= 0 && p.y >= 0 && p.z >= 0 && p.x < d.x && p.y < d.y && p.z < d.z;

/** The two axes a line along `axis` is fixed on, in the order its id uses (major, minor). */
const FIXED: Record<Axis, [Axis, Axis]> = { x: ['y', 'z'], y: ['z', 'x'], z: ['y', 'x'] };

/**
 * A line of cubes running along one axis. Every line has a clue: how many of its cubes
 * belong to the shape, and in how many pieces.
 */
export interface Line {
  axis: Axis;
  /** The cubes in order from the low end of the axis to the high end. */
  cells: number[];
  /** Position in `allLines()`. */
  id: number;
}

/** How many lines run along each axis. */
export const lineCount = (d: Dims, axis: Axis) => d[FIXED[axis][0]] * d[FIXED[axis][1]];

/** The line along `axis` through point `p`, as its id. */
export function lineIdAt(d: Dims, axis: Axis, p: Point): number {
  const [major, minor] = FIXED[axis];
  let offset = 0;
  for (const a of AXES) {
    if (a === axis) break;
    offset += lineCount(d, a);
  }
  return offset + p[major] * d[minor] + p[minor];
}

/** Every line: all the x lines, then the y lines, then the z lines. The order ids and saves use. */
export function allLines(d: Dims): Line[] {
  const lines: Line[] = [];
  for (const axis of AXES) {
    const [major, minor] = FIXED[axis];
    for (let a = 0; a < d[major]; a++) {
      for (let b = 0; b < d[minor]; b++) {
        const cells: number[] = [];
        for (let t = 0; t < d[axis]; t++) {
          cells.push(indexOf(d, { [axis]: t, [major]: a, [minor]: b } as unknown as Point));
        }
        lines.push({ axis, cells, id: lines.length });
      }
    }
  }
  return lines;
}

/** "4×5×3", width by height by depth. */
export const dimsLabel = (d: Dims) => `${d.x}×${d.y}×${d.z}`;
