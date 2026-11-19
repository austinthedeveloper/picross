/**
 * A brick build in progress: the layers from `splitIntoBricks`, which slots are filled, and
 * which layer is up. No DOM, no three.js; `play-block`'s build screen drives it.
 *
 * Bricks of the same size and color are interchangeable, so the tray holds kinds with a
 * count, not particular bricks: a brick snaps into any open slot of its kind near where it
 * was dropped, turned the same way (square bricks fit either way).
 *
 * `BuildRules` make it easier for little kids (the bricks route, docs/brick-kids.md): a
 * longer reach, bricks that turn themselves, and one kind in the tray at a time. Left out,
 * the build plays as Cubed's build stage always has.
 */
import {
  BRICK_SIZES,
  footprint,
  isSquare,
  type Brick,
  type BrickSize,
  type Rotation,
  type Shape,
} from './bricks';
import { splitIntoBricks } from './bricks';

/** One pile in the tray: how many bricks of a size and color the layer still needs. */
export interface TrayKind {
  key: string;
  size: BrickSize;
  color: number;
  count: number;
}

export const kindKey = (b: { size: BrickSize; color: number }) => `${b.size}:${b.color}`;

/** Whether a brick held this way fits a slot. `anyTurn`: either way round will do. */
export const fits = (
  slot: Brick,
  size: BrickSize,
  color: number,
  rotation: Rotation,
  anyTurn = false,
) =>
  slot.size === size &&
  slot.color === color &&
  (anyTurn || isSquare(size) || slot.rotation === rotation);

/** How far, in cubes, a dropped brick can be from a slot and still snap into it. */
export const SNAP_REACH = 1;

/** How a build plays. Each is off (as in Cubed's build stage) unless set. */
export interface BuildRules {
  /**
   * How far, in cubes, a drop can be from an open slot and still snap into it. Default
   * `SNAP_REACH`; `Infinity` snaps a drop anywhere into the nearest open slot of its kind.
   */
  reach?: number;
  /** A brick fits a slot turned either way, and turns itself on the way in. */
  anyTurn?: boolean;
  /** The tray offers only one kind at a time: the biggest bricks first. */
  oneKind?: boolean;
}

const areaOf = (size: BrickSize) => {
  const s = BRICK_SIZES.find((b) => b.size === size)!;
  return s.w * s.d;
};

/** A brick's middle on the plate, in cubes, for this footprint with its corner at (x, z). */
const middle = (size: BrickSize, rotation: Rotation, x: number, z: number) => {
  const { sx, sz } = footprint(size, rotation);
  return { x: x + sx / 2, z: z + sz / 2 };
};

export class BrickBuild {
  readonly layers: Brick[][];
  readonly rules: Readonly<BuildRules>;
  /** The layer being built (an index into `layers`). */
  layer: number;
  private filled: boolean[][];

  /** Starts at `startLayer`, with every layer under it already built. */
  constructor(layers: Brick[][], startLayer = 0, rules: BuildRules = {}) {
    this.layers = layers;
    this.rules = rules;
    this.layer = Math.max(0, Math.min(startLayer, layers.length - 1));
    this.filled = layers.map((bricks, i) => bricks.map(() => i < this.layer));
  }

  static fromShape(shape: Shape, startLayer = 0, rules: BuildRules = {}): BrickBuild {
    return new BrickBuild(splitIntoBricks(shape), startLayer, rules);
  }

  /** The bricks of the layer being built. */
  get current(): Brick[] {
    return this.layers[this.layer] ?? [];
  }

  isFilled(layer: number, slot: number): boolean {
    return this.filled[layer]?.[slot] ?? false;
  }

  /**
   * What the tray shows: the current layer's unplaced bricks, by kind, in the order the
   * layer has them. With `oneKind`, only the first of the biggest kind left.
   */
  tray(): TrayKind[] {
    const kinds = new Map<string, TrayKind>();
    this.current.forEach((b, i) => {
      if (this.filled[this.layer][i]) return;
      const key = kindKey(b);
      const kind = kinds.get(key) ?? { key, size: b.size, color: b.color, count: 0 };
      kind.count++;
      kinds.set(key, kind);
    });
    const all = [...kinds.values()];
    if (!this.rules.oneKind || !all.length) return all;
    // Biggest first; the same size keeps the layer's order (a stable sort).
    return [all.sort((a, b) => areaOf(b.size) - areaOf(a.size))[0]];
  }

  /** The open slots of the current layer this kind fits (any way round). */
  openSlots(kind: { size: BrickSize; color: number }): number[] {
    const slots: number[] = [];
    this.current.forEach((b, i) => {
      if (!this.filled[this.layer][i] && kindKey(b) === kindKey(kind)) slots.push(i);
    });
    return slots;
  }

  /**
   * The open slot of the current layer that a brick dropped with its first corner at
   * (x, z) snaps into, or null when none is near enough (`rules.reach`, measured between
   * the brick's middle and the slot's). The nearest wins.
   */
  snapTarget(
    size: BrickSize,
    color: number,
    rotation: Rotation,
    x: number,
    z: number,
  ): number | null {
    const reach = this.rules.reach ?? SNAP_REACH;
    const at = middle(size, rotation, x, z);
    let best: { slot: number; distance: number; tie: number } | null = null;
    this.current.forEach((slot, i) => {
      if (this.filled[this.layer][i] || !fits(slot, size, color, rotation, this.rules.anyTurn))
        return;
      const mid = middle(slot.size, slot.rotation, slot.position.x, slot.position.z);
      const [dx, dz] = [Math.abs(mid.x - at.x), Math.abs(mid.z - at.z)];
      // Steps on the grid, then straight-line distance between two as many steps away.
      const distance = Math.max(dx, dz);
      const tie = dx * dx + dz * dz;
      if (
        distance <= reach &&
        (!best || distance < best.distance || (distance === best.distance && tie < best.tie))
      ) {
        best = { slot: i, distance, tie };
      }
    });
    return (best as { slot: number } | null)?.slot ?? null;
  }

  /** Fills a slot of the current layer. True when that finished the layer. */
  place(slot: number): boolean {
    if (!this.current[slot]) throw new Error(`No slot ${slot} in layer ${this.layer}`);
    this.filled[this.layer][slot] = true;
    return this.layerComplete;
  }

  /** Every slot of the current layer is filled. */
  get layerComplete(): boolean {
    return this.filled[this.layer]?.every(Boolean) ?? false;
  }

  /** Every layer is filled, the top one included. */
  get complete(): boolean {
    return this.filled.every((layer) => layer.every(Boolean));
  }

  /** Moves up to the next layer once this one is done. True if it moved. */
  advance(): boolean {
    if (!this.layerComplete || this.layer >= this.layers.length - 1) return false;
    this.layer++;
    return true;
  }

  /** Fills the rest of the current layer (the build screen's test key). The slots it filled. */
  fillLayer(): number[] {
    const slots: number[] = [];
    this.filled[this.layer].forEach((done, i) => {
      if (!done) slots.push(i);
    });
    for (const slot of slots) this.filled[this.layer][slot] = true;
    return slots;
  }
}
