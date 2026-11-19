/**
 * A brick build in progress: the layers from `splitIntoBricks`, which slots are filled, and
 * which layer is up. No DOM, no three.js; `play-block`'s build screen drives it.
 *
 * Bricks of the same size and color are interchangeable, so the tray holds kinds with a
 * count, not particular bricks: a brick snaps into any open slot of its kind near where it
 * was dropped, turned the same way (square bricks fit either way).
 */
import { isSquare, type Brick, type BrickSize, type Rotation, type Shape } from './bricks';
import { splitIntoBricks } from './bricks';

/** One pile in the tray: how many bricks of a size and color the layer still needs. */
export interface TrayKind {
  key: string;
  size: BrickSize;
  color: number;
  count: number;
}

export const kindKey = (b: { size: BrickSize; color: number }) => `${b.size}:${b.color}`;

/** Whether a brick held this way fits a slot. */
export const fits = (slot: Brick, size: BrickSize, color: number, rotation: Rotation) =>
  slot.size === size && slot.color === color && (isSquare(size) || slot.rotation === rotation);

/** How far, in cubes, a dropped brick can be from a slot and still snap into it. */
export const SNAP_REACH = 1;

export class BrickBuild {
  readonly layers: Brick[][];
  /** The layer being built (an index into `layers`). */
  layer: number;
  private filled: boolean[][];

  /** Starts at `startLayer`, with every layer under it already built. */
  constructor(layers: Brick[][], startLayer = 0) {
    this.layers = layers;
    this.layer = Math.max(0, Math.min(startLayer, layers.length - 1));
    this.filled = layers.map((bricks, i) => bricks.map(() => i < this.layer));
  }

  static fromShape(shape: Shape, startLayer = 0): BrickBuild {
    return new BrickBuild(splitIntoBricks(shape), startLayer);
  }

  /** The bricks of the layer being built. */
  get current(): Brick[] {
    return this.layers[this.layer] ?? [];
  }

  isFilled(layer: number, slot: number): boolean {
    return this.filled[layer]?.[slot] ?? false;
  }

  /** What the tray shows: the current layer's unplaced bricks, by kind. */
  tray(): TrayKind[] {
    const kinds = new Map<string, TrayKind>();
    this.current.forEach((b, i) => {
      if (this.filled[this.layer][i]) return;
      const key = kindKey(b);
      const kind = kinds.get(key) ?? { key, size: b.size, color: b.color, count: 0 };
      kind.count++;
      kinds.set(key, kind);
    });
    return [...kinds.values()];
  }

  /**
   * The open slot of the current layer that a brick dropped with its first corner at
   * (x, z) snaps into, or null when none is near enough.
   */
  snapTarget(
    size: BrickSize,
    color: number,
    rotation: Rotation,
    x: number,
    z: number,
  ): number | null {
    let best: { slot: number; distance: number } | null = null;
    this.current.forEach((slot, i) => {
      if (this.filled[this.layer][i] || !fits(slot, size, color, rotation)) return;
      const distance = Math.max(Math.abs(slot.position.x - x), Math.abs(slot.position.z - z));
      if (distance <= SNAP_REACH && (!best || distance < best.distance)) {
        best = { slot: i, distance };
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
