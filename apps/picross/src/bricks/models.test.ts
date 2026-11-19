import { describe, expect, it } from 'vitest';
import { splitIntoBricks } from '@picross/block/build/bricks';
import { BrickBuild } from '@picross/block/build/build';
import { BRICKS_PUZZLES, getBricksPuzzle } from '@picross/block/puzzles/bricks';
import { BRICKS_MODELS, bricksModel, KIDS_RULES } from './models';

describe('the bricks route’s models', () => {
  it('are all there, and small: a short sitting each', () => {
    for (const id of BRICKS_MODELS) {
      const model = bricksModel(id);
      expect(model, id).toBeDefined();
      const layers = splitIntoBricks(model!);
      // The pack's ten are 20 bricks or fewer; Brick kids' own and the trio's dog are up to
      // about 30, for a few minutes' building at most.
      const own = Boolean(getBricksPuzzle(id)) || id === 'dog';
      expect(layers.flat().length, id).toBeLessThanOrEqual(own ? 34 : 20);
      expect(layers.length, id).toBeLessThanOrEqual(8);
    }
  });

  it('include every one of its own', () => {
    expect(BRICKS_PUZZLES.length).toBeGreaterThanOrEqual(20);
    for (const p of BRICKS_PUZZLES) expect(BRICKS_MODELS, p.id).toContain(p.id);
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

  it('every one builds by taps: any kind in the tray, from any tap', () => {
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
        while (!build.layerComplete) {
          // The whole layer's in the tray, every kind it still needs.
          const tray = build.tray();
          expect(tray.reduce((n, k) => n + k.count, 0)).toBe(
            build.current.filter((_, i) => !build.isFilled(build.layer, i)).length,
          );
          // A child picks any of them: here, each in turn.
          const kind = tray[placed % tray.length];
          // Held the "wrong" way round on purpose: it turns itself.
          const tap = taps[placed % taps.length];
          const slot = build.snapTarget(kind.size, kind.color, 90, tap.x, tap.z);
          expect(slot, id).not.toBeNull();
          expect(build.current[slot!].size).toBe(kind.size);
          expect(build.current[slot!].color).toBe(kind.color);
          build.place(slot!);
          placed++;
        }
        if (!build.advance()) break;
      }
      expect(build.complete, id).toBe(true);
      expect(placed).toBe(build.layers.flat().length);
    }
  });

  it('shows every kind in the tray, not one at a time', () => {
    expect(KIDS_RULES.oneKind).toBeFalsy();
    const dog = BrickBuild.fromShape(bricksModel('dog')!, 3, KIDS_RULES);
    expect(dog.tray()).toHaveLength(4); // the dog's fourth layer: four kinds
  });
});
