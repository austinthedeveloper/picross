import { describe, expect, it } from 'vitest';
import { indexOf, pointOf, volume } from '../engine/volume';
import { PUZZLES } from '../puzzles/index';
import { TRIO_PUZZLES, getTrioPuzzle } from '../puzzles/trio';
import { BRICK_SIZES, cellsOf, footprint, splitIntoBricks, type Shape } from './bricks';

/** Every puzzle we can build: the trio's, and the whole free-play pack. */
const SHAPES: [string, Shape][] = [...TRIO_PUZZLES, ...PUZZLES].map((p) => [p.id, p]);

describe('splitIntoBricks', () => {
  it.each(SHAPES)('%s: every cube is covered by exactly one brick', (_, shape) => {
    const covered = new Uint8Array(volume(shape.dims));
    for (const layer of splitIntoBricks(shape)) {
      for (const brick of layer) for (const p of cellsOf(brick)) covered[indexOf(shape.dims, p)]++;
    }
    for (let i = 0; i < covered.length; i++) {
      expect(covered[i], `cube ${JSON.stringify(pointOf(shape.dims, i))}`).toBe(
        shape.solution[i] ? 1 : 0,
      );
    }
  });

  it.each(SHAPES)('%s: bricks are one color and stay inside the shape', (_, shape) => {
    for (const layer of splitIntoBricks(shape)) {
      for (const brick of layer) {
        for (const p of cellsOf(brick)) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.z).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThan(shape.dims.x);
          expect(p.z).toBeLessThan(shape.dims.z);
          // Leaving the model or spanning two colors both show up as a cube of another color.
          expect(shape.solution[indexOf(shape.dims, p)]).toBe(brick.color);
        }
      }
    }
  });

  it('lists layers bottom first, each brick on its own layer, from the brick set', () => {
    const dog = getTrioPuzzle('dog')!;
    const layers = splitIntoBricks(dog);
    expect(layers).toHaveLength(dog.dims.y);
    layers.forEach((layer, y) => {
      for (const brick of layer) {
        expect(brick.position.y).toBe(y);
        expect(BRICK_SIZES.map((s) => s.size)).toContain(brick.size);
        if (brick.size === '1x1' || brick.size === '2x2') expect(brick.rotation).toBe(0);
      }
    });
  });

  it('gives the same bricks every time', () => {
    for (const [, shape] of SHAPES.slice(0, 20)) {
      expect(splitIntoBricks(shape)).toEqual(splitIntoBricks(shape));
    }
  });

  it('skips empty layers', () => {
    const solution = new Uint8Array(8);
    solution[0] = 1; // one cube on the bottom layer of a 2×2×2 block, nothing above it
    expect(splitIntoBricks({ dims: { x: 2, y: 2, z: 2 }, solution })).toHaveLength(1);
  });

  it('uses the biggest brick that fits one color', () => {
    const solution = new Uint8Array(8).fill(1); // 2×1×4, one color
    expect(splitIntoBricks({ dims: { x: 2, y: 1, z: 4 }, solution })).toEqual([
      [{ size: '2x4', position: { x: 0, y: 0, z: 0 }, rotation: 0, color: 1 }],
    ]);
    solution[7] = 2; // one cube of another color: no 2×4 now
    const [layer] = splitIntoBricks({ dims: { x: 2, y: 1, z: 4 }, solution });
    expect(layer.map((b) => b.size).sort()).toEqual(['1x1', '1x1', '1x2', '2x2']);
  });

  it('crosses the seams of the layer below, like a real wall', () => {
    // A wall 8 long, 1 deep and 3 high: each layer is two 1×4s, and no seam sits on a seam.
    const dims = { x: 8, y: 3, z: 1 };
    const layers = splitIntoBricks({ dims, solution: new Uint8Array(volume(dims)).fill(1) });
    const seams = layers.map(
      (layer) =>
        new Set(
          layer
            .map((b) => b.position.x + footprint(b.size, b.rotation).sx)
            .filter((x) => x < dims.x),
        ),
    );
    for (let y = 1; y < seams.length; y++) {
      for (const x of seams[y])
        expect(seams[y - 1].has(x), `seam at x=${x}, layer ${y}`).toBe(false);
    }
  });
});
