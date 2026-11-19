import { describe, expect, it } from 'vitest';
import { BRICK_SIZES, splitIntoBricks } from '@picross/block/build/bricks';
import { BrickBuild } from '@picross/block/build/build';
import { BRICKS_MODELS, bricksModel, KIDS_RULES } from './models';

const area = (size: string) => {
  const s = BRICK_SIZES.find((b) => b.size === size)!;
  return s.w * s.d;
};

describe('the bricks route’s models', () => {
  it('are all there, and small: a short sitting each', () => {
    for (const id of BRICKS_MODELS) {
      const model = bricksModel(id);
      expect(model, id).toBeDefined();
      const layers = splitIntoBricks(model!);
      // The pack's ten are 20 bricks or fewer; the trio's dog is a little more.
      expect(layers.flat().length, id).toBeLessThanOrEqual(id === 'dog' ? 26 : 20);
      expect(layers.length, id).toBeLessThanOrEqual(8);
    }
  });

  it('are fewest bricks first', () => {
    const counts = BRICKS_MODELS.map((id) => splitIntoBricks(bricksModel(id)!).flat().length);
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it('opens only its own models', () => {
    expect(bricksModel('car')?.name).toBe('Car');
    expect(bricksModel('mug')).toBeUndefined(); // a pack model, but too big
    expect(bricksModel('no-such-model')).toBeUndefined();
  });

  it('every one builds by taps: one kind at a time, biggest first, from any tap', () => {
    for (const id of BRICKS_MODELS) {
      const model = bricksModel(id)!;
      const build = BrickBuild.fromShape(model, 0, KIDS_RULES);
      // Taps at the plate's corners and middle, and one far off it.
      const taps = [
        { x: 0, z: 0 },
        { x: model.dims.x - 1, z: model.dims.z - 1 },
        { x: Math.floor(model.dims.x / 2), z: Math.floor(model.dims.z / 2) },
        { x: -9, z: 40 },
      ];
      let placed = 0;
      for (;;) {
        let last = Infinity;
        while (!build.layerComplete) {
          const tray = build.tray();
          expect(tray, id).toHaveLength(1);
          const [kind] = tray;
          expect(area(kind.size), id).toBeLessThanOrEqual(last);
          last = area(kind.size);
          // Held the "wrong" way round on purpose: it turns itself.
          const tap = taps[placed % taps.length];
          const slot = build.snapTarget(kind.size, kind.color, 90, tap.x, tap.z);
          expect(slot, id).not.toBeNull();
          expect(build.current[slot!].size).toBe(kind.size);
          build.place(slot!);
          placed++;
        }
        if (!build.advance()) break;
      }
      expect(build.complete, id).toBe(true);
      expect(placed).toBe(build.layers.flat().length);
    }
  });
});
