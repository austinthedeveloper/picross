import { describe, expect, it } from 'vitest';
import { splitIntoBricks } from '../build/bricks';
import { BRICKS_PUZZLES } from './bricks';

describe("Brick kids' own models", () => {
  it('are there', () => {
    expect(BRICKS_PUZZLES.length).toBeGreaterThanOrEqual(20);
  });

  it.each(BRICKS_PUZZLES.map((p) => [p.id, p] as const))('%s is kid-sized', (_, p) => {
    // Small and chunky: a few colors, no side longer than 8, and 8 layers at most.
    expect(p.palette.length).toBeLessThanOrEqual(5);
    expect(Math.max(p.dims.x, p.dims.y, p.dims.z)).toBeLessThanOrEqual(8);
    expect(splitIntoBricks(p).length).toBeLessThanOrEqual(8);
  });
});
