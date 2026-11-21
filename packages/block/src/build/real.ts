/**
 * A build in real toy bricks (docs/bricks-real.md): what to have out (the parts list), and
 * whether the split holds together off the screen. On the screen a brick can sit on air and
 * a model can be two loose halves; in real bricks, a brick holds only by its studs, to the
 * bricks right above and below it, and you build from the bottom up.
 */
import { BRICK_SIZES, cellsOf, type Brick, type BrickSize } from './bricks';

/** One line of a parts list: how many bricks of a size and color. */
export interface Part {
  size: BrickSize;
  /** As in `Brick.color`: 1 + an index into the model's palette. */
  color: number;
  count: number;
}

const ORDER = BRICK_SIZES.map((s) => s.size);

/** The bricks counted by size and color: biggest first, then by color. */
export function partsOf(bricks: readonly Brick[]): Part[] {
  const counts = new Map<string, Part>();
  for (const b of bricks) {
    const key = `${b.size}:${b.color}`;
    const part = counts.get(key) ?? { size: b.size, color: b.color, count: 0 };
    part.count++;
    counts.set(key, part);
  }
  return [...counts.values()].sort(
    (a, b) => ORDER.indexOf(a.size) - ORDER.indexOf(b.size) || a.color - b.color,
  );
}

/** Where a brick is in the build: its layer (from 0) and its place in that layer. */
export interface BrickAt {
  layer: number;
  slot: number;
}

export interface RealCheck {
  /**
   * Bricks with nothing under any of their studs (not the plate, not a brick), so they
   * can't go on from below. Each still holds if something above it does (`hangs`).
   */
  floating: BrickAt[];
  /** The floating ones with a brick right above, which can be pressed on from underneath. */
  hangs: BrickAt[];
  /**
   * How many pieces it comes off the plate in. Bricks hold only by studs, so two bricks
   * side by side in one layer don't hold each other. 1 is a toy you can pick up.
   */
  pieces: number;
  /** The bricks of each piece, biggest piece first. */
  groups: BrickAt[][];
  /**
   * The pieces with no brick on the bottom layer, which a base plate can't hold either: a
   * beak or a cap that only touches the toy from the side. Empty means it builds on a plate.
   */
  loose: BrickAt[][];
}

/** How well a split builds in real bricks, best first. */
export type RealFit =
  /** One toy, built from the bottom up. */
  | 'stands'
  /** One toy, but some bricks press on from underneath the brick above. */
  | 'hangs'
  /** It holds on a base plate, and comes off it in pieces. */
  | 'plate'
  /** Some bricks only touch it from the side, so they fall off. */
  | 'loose';

export function realFit(check: RealCheck): RealFit {
  if (check.loose.length) return 'loose';
  if (check.pieces > 1) return 'plate';
  return check.floating.length ? 'hangs' : 'stands';
}

/** Whether the split builds as one toy, from the bottom up, in real bricks. */
export function checkReal(layers: readonly (readonly Brick[])[]): RealCheck {
  const all: { at: BrickAt; brick: Brick }[] = layers.flatMap((bricks, layer) =>
    bricks.map((brick, slot) => ({ at: { layer, slot }, brick })),
  );
  // Which brick covers each cube.
  const owner = new Map<string, number>();
  all.forEach(({ brick }, i) => {
    for (const p of cellsOf(brick)) owner.set(`${p.x},${p.y},${p.z}`, i);
  });
  const touching = (i: number, dy: number) => {
    const out = new Set<number>();
    for (const p of cellsOf(all[i].brick)) {
      const j = owner.get(`${p.x},${p.y + dy},${p.z}`);
      if (j !== undefined) out.add(j);
    }
    return out;
  };
  const bottom = Math.min(...all.map((a) => a.brick.position.y));
  const onBottom = (layer: number, slot: number) => layers[layer][slot].position.y === bottom;

  const floating: BrickAt[] = [];
  const hangs: BrickAt[] = [];
  all.forEach(({ at, brick }, i) => {
    if (brick.position.y === bottom || touching(i, -1).size) return;
    floating.push(at);
    if (touching(i, 1).size) hangs.push(at);
  });

  // Pieces: bricks joined through studs, above or below.
  const seen = new Int32Array(all.length).fill(-1);
  const groups: BrickAt[][] = [];
  for (let start = 0; start < all.length; start++) {
    if (seen[start] >= 0) continue;
    const group: BrickAt[] = [];
    const stack = [start];
    seen[start] = groups.length;
    while (stack.length) {
      const i = stack.pop()!;
      group.push(all[i].at);
      for (const j of [...touching(i, -1), ...touching(i, 1)]) {
        if (seen[j] < 0) {
          seen[j] = groups.length;
          stack.push(j);
        }
      }
    }
    groups.push(group);
  }
  groups.sort((a, b) => b.length - a.length);
  const loose = groups.filter((g) => !g.some(({ layer, slot }) => onBottom(layer, slot)));
  return { floating, hangs, pieces: groups.length, groups, loose };
}
