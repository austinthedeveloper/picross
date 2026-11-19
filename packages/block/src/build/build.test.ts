import { describe, expect, it } from 'vitest';
import { getTrioPuzzle } from '../puzzles/trio';
import { BrickBuild, fits } from './build';
import { splitIntoBricks, type Brick } from './bricks';
import { parseBuildPath, startBuild } from './entry';

const dog = getTrioPuzzle('dog')!;

/** Puts the current layer's bricks in, one by one, the way the screen does. */
function fillByHand(build: BrickBuild): boolean[] {
  const after: boolean[] = [];
  for (const brick of [...build.current]) {
    const slot = build.snapTarget(
      brick.size,
      brick.color,
      brick.rotation,
      brick.position.x,
      brick.position.z,
    );
    expect(slot).not.toBeNull();
    after.push(build.place(slot!));
  }
  return after;
}

describe('BrickBuild', () => {
  it('a layer is complete only once every slot is filled', () => {
    const build = BrickBuild.fromShape(dog);
    const after = fillByHand(build);
    expect(after.slice(0, -1).every((done) => !done)).toBe(true);
    expect(after.at(-1)).toBe(true);
    expect(build.layerComplete).toBe(true);
  });

  it("won't move up until the layer is done", () => {
    const build = BrickBuild.fromShape(dog);
    expect(build.advance()).toBe(false);
    expect(build.layer).toBe(0);
    fillByHand(build);
    expect(build.advance()).toBe(true);
    expect(build.layer).toBe(1);
    expect(build.layerComplete).toBe(false);
  });

  it('the build is complete only after the top layer', () => {
    const build = BrickBuild.fromShape(dog);
    const layers = build.layers.length;
    for (let i = 0; i < layers; i++) {
      expect(build.complete).toBe(false);
      fillByHand(build);
      if (i < layers - 1) {
        expect(build.complete).toBe(false);
        expect(build.advance()).toBe(true);
      }
    }
    expect(build.complete).toBe(true);
    expect(build.advance()).toBe(false);
  });

  it('the tray holds the current layer, by kind', () => {
    const build = BrickBuild.fromShape(dog);
    const total = build.tray().reduce((n, k) => n + k.count, 0);
    expect(total).toBe(build.current.length);
    build.place(0);
    expect(build.tray().reduce((n, k) => n + k.count, 0)).toBe(total - 1);
  });

  it('snaps a brick that fits into a slot near where it was dropped', () => {
    const brick: Brick = { size: '1x2', position: { x: 2, y: 0, z: 2 }, rotation: 0, color: 1 };
    const build = new BrickBuild([[brick]]);
    expect(build.snapTarget('1x2', 1, 0, 3, 1)).toBe(0); // one off each way: close enough
    expect(build.snapTarget('1x2', 1, 0, 4, 2)).toBeNull(); // two off
    expect(build.snapTarget('1x2', 1, 90, 2, 2)).toBeNull(); // turned the wrong way
    expect(build.snapTarget('1x2', 2, 0, 2, 2)).toBeNull(); // the wrong color
    expect(build.snapTarget('1x4', 1, 0, 2, 2)).toBeNull(); // the wrong size
    build.place(0);
    expect(build.snapTarget('1x2', 1, 0, 2, 2)).toBeNull(); // already filled
  });

  it('square bricks fit either way round', () => {
    const slot: Brick = { size: '2x2', position: { x: 0, y: 0, z: 0 }, rotation: 0, color: 1 };
    expect(fits(slot, '2x2', 1, 90)).toBe(true);
    expect(fits({ ...slot, size: '1x2' }, '1x2', 1, 90)).toBe(false);
  });

  it('starts partway with the layers below built', () => {
    const build = BrickBuild.fromShape(dog, 3);
    expect(build.layer).toBe(3);
    expect(build.isFilled(2, 0)).toBe(true);
    expect(build.isFilled(3, 0)).toBe(false);
    expect(build.fillLayer().length).toBe(build.current.length);
    expect(build.layerComplete).toBe(true);
  });
});

describe('the build entry (#/cubed/build/<id>)', () => {
  it('reads the puzzle and the layer to start on', () => {
    expect(parseBuildPath('/build/dog')).toEqual({ id: 'dog', layer: 0 });
    expect(parseBuildPath('/build/dog?layer=3')).toEqual({ id: 'dog', layer: 2 });
    expect(parseBuildPath('/build/dog?layer=nope')).toEqual({ id: 'dog', layer: 0 });
    expect(parseBuildPath('/play/dog')).toBeNull();
  });

  it('loads the solved model straight into the build, with every layer', () => {
    const started = startBuild({ id: 'dog', layer: 0 })!;
    expect(started.puzzle.id).toBe('dog');
    expect(started.build.layers).toHaveLength(splitIntoBricks(dog).length);
    expect(started.build.layers).toHaveLength(8);
    expect(started.build.layer).toBe(0);
  });

  it('starts on the layer asked for, and any pack puzzle builds too', () => {
    expect(startBuild({ id: 'dog', layer: 5 })!.build.layer).toBe(5);
    expect(startBuild({ id: 'dog', layer: 99 })!.build.layer).toBe(7);
    expect(startBuild({ id: 'mug', layer: 0 })!.build.layers.length).toBeGreaterThan(0);
    expect(startBuild({ id: 'no-such-puzzle', layer: 0 })).toBeNull();
  });
});
