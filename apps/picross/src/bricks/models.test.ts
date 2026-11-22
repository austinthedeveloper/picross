import { describe, expect, it } from 'vitest';
import { footprint, splitIntoBricks, type Rotation } from '@picross/block/build/bricks';
import { BrickBuild, SNAP_REACH, type TrayKind } from '@picross/block/build/build';
import { BRICKS_PUZZLES, getBricksPuzzle } from '@picross/block/puzzles/bricks';
import { BRICKS_MODELS, bricksModel, KIDS_RULES } from './models';

/** The corner a brick held `rotation` lands at, tapped on the middle of a ghost of its kind. */
function tapOn(build: BrickBuild, kind: TrayKind, rotation: Rotation): [number, number] {
  const ghost = build.current[build.openSlots(kind)[0]];
  const a = footprint(ghost.size, ghost.rotation);
  const b = footprint(kind.size, rotation);
  return [
    Math.round(ghost.position.x + a.sx / 2 - b.sx / 2),
    Math.round(ghost.position.z + a.sz / 2 - b.sz / 2),
  ];
}

describe('the bricks route’s models', () => {
  it('are all there, and small: a short sitting each', () => {
    for (const id of BRICKS_MODELS) {
      const model = bricksModel(id);
      expect(model, id).toBeDefined();
      const layers = splitIntoBricks(model!);
      // The pack's ten are 20 bricks or fewer; Brick kids' own and the trio's dog are up to
      // about 30, for a few minutes' building at most.
      const own = Boolean(getBricksPuzzle(id)) || id === 'dog';
      expect(layers.flat().length, id).toBeLessThanOrEqual(own ? 36 : 20);
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

  it('every one builds by taps on its ghosts, any kind in the tray', () => {
    for (const id of BRICKS_MODELS) {
      const model = bricksModel(id)!;
      const build = BrickBuild.fromShape(model, 0, KIDS_RULES);
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
          // A tap on the middle of one of its ghosts, held the "wrong" way round on
          // purpose: it turns itself. (The screen puts the brick's middle under the tap.)
          const slot = build.snapTarget(kind.size, kind.color, 90, ...tapOn(build, kind, 90));
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

  it('snaps only near a ghost of its kind: a tap anywhere else misses', () => {
    expect(KIDS_RULES.reach).toBe(SNAP_REACH);
    // The car's bottom layer: its wheels.
    const build = BrickBuild.fromShape(bricksModel('car')!, 0, KIDS_RULES);
    const [kind] = build.tray();
    const ghost = build.current[build.openSlots(kind)[0]].position;
    // On it, or a cube off: in.
    expect(build.snapTarget(kind.size, kind.color, 0, ghost.x, ghost.z)).not.toBeNull();
    expect(build.snapTarget(kind.size, kind.color, 0, ghost.x + 1, ghost.z)).not.toBeNull();
    // Off the plate: no.
    expect(build.snapTarget(kind.size, kind.color, 0, -9, 40)).toBeNull();
  });

  it('shows every kind in the tray, not one at a time', () => {
    expect(KIDS_RULES.oneKind).toBeFalsy();
    const dog = BrickBuild.fromShape(bricksModel('dog')!, 3, KIDS_RULES);
    expect(dog.tray()).toHaveLength(4); // the dog's fourth layer: four kinds
  });
});
