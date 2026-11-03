import { describe, expect, it } from 'vitest';
import { TRANSFORMS, transformGrid } from './transform';

// 3 wide, 2 tall:  a b c
//                  d e f
const grid = { width: 3, height: 2, cells: ['a', 'b', 'c', 'd', 'e', 'f'] };
const rows = (g: { width: number; cells: string[] }) =>
  Array.from({ length: g.cells.length / g.width }, (_, r) =>
    g.cells.slice(r * g.width, (r + 1) * g.width).join(''),
  );

describe('transformGrid', () => {
  it.each([
    [0, ['abc', 'def']],
    [1, ['da', 'eb', 'fc']], // a quarter turn clockwise
    [2, ['fed', 'cba']],
    [3, ['cf', 'be', 'ad']],
    [4, ['cba', 'fed']], // flipped left to right
    [5, ['fc', 'eb', 'da']],
    [6, ['def', 'abc']],
    [7, ['ad', 'be', 'cf']],
  ])('%i: %j', (t, expected) => {
    expect(rows(transformGrid(grid, t))).toEqual(expected);
  });

  it('gives eight different grids for a lopsided picture', () => {
    const all = TRANSFORMS.map((_, t) => rows(transformGrid(grid, t)).join('/'));
    expect(new Set(all).size).toBe(8);
  });
});
