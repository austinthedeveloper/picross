import { describe, expect, it } from 'vitest';
import type { Brick } from './bricks';
import { checkReal, partsOf, realFit } from './real';

const brick = (
  size: Brick['size'],
  x: number,
  y: number,
  z: number,
  rotation: Brick['rotation'] = 0,
  color = 1,
): Brick => ({ size, position: { x, y, z }, rotation, color });

describe('partsOf', () => {
  it('counts by size and color, biggest first', () => {
    const parts = partsOf([
      brick('1x2', 0, 0, 0),
      brick('2x4', 2, 0, 0, 0, 2),
      brick('1x2', 0, 1, 0),
      brick('1x2', 0, 2, 0, 0, 3),
    ]);
    expect(parts).toEqual([
      { size: '2x4', color: 2, count: 1 },
      { size: '1x2', color: 1, count: 2 },
      { size: '1x2', color: 3, count: 1 },
    ]);
  });
});

describe('checkReal', () => {
  it('a wall with crossed seams is one toy that stands', () => {
    const layers = [
      [brick('1x4', 0, 0, 0, 90), brick('1x4', 4, 0, 0, 90)],
      [brick('1x2', 0, 1, 0, 90), brick('1x4', 2, 1, 0, 90), brick('1x2', 6, 1, 0, 90)],
    ];
    const check = checkReal(layers);
    expect(check).toMatchObject({ floating: [], hangs: [], pieces: 1, loose: [] });
    expect(realFit(check)).toBe('stands');
  });

  it('two columns side by side are two pieces, held only by a base plate', () => {
    const layers = [
      [brick('2x2', 0, 0, 0), brick('2x2', 2, 0, 0)],
      [brick('2x2', 0, 1, 0), brick('2x2', 2, 1, 0)],
    ];
    const check = checkReal(layers);
    expect(check.pieces).toBe(2);
    expect(check.loose).toEqual([]);
    expect(realFit(check)).toBe('plate');
  });

  it('a brick over a gap hangs from the one above it', () => {
    // Two legs, a brick bridging nothing between them, and a top over all three.
    const layers = [
      [brick('1x1', 0, 0, 0), brick('1x1', 2, 0, 0)],
      [brick('1x1', 0, 1, 0), brick('1x1', 1, 1, 0), brick('1x1', 2, 1, 0)],
      [brick('1x4', 0, 2, 0, 90)],
    ];
    const check = checkReal(layers);
    expect(check.floating).toEqual([{ layer: 1, slot: 1 }]);
    expect(check.hangs).toEqual([{ layer: 1, slot: 1 }]);
    expect(check.pieces).toBe(1);
    expect(realFit(check)).toBe('hangs');
  });

  it('a beak that only touches the head from the side is loose', () => {
    const layers = [[brick('2x2', 1, 0, 0)], [brick('2x2', 1, 1, 0), brick('1x2', 0, 1, 0)]];
    const check = checkReal(layers);
    expect(check.floating).toEqual([{ layer: 1, slot: 1 }]);
    expect(check.hangs).toEqual([]);
    expect(check.loose).toEqual([[{ layer: 1, slot: 1 }]]);
    expect(realFit(check)).toBe('loose');
  });
});
