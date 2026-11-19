import { describe, expect, it } from 'vitest';
import { splitIntoBricks } from '../build/bricks';
import { BRICKS_PUZZLES } from './bricks';
import { getPuzzle, getStoryPuzzle } from './index';
import { getTrioPuzzle } from './trio';

describe("Brick kids' own models", () => {
  it.each(BRICKS_PUZZLES.map((p) => [p.id, p] as const))(
    "%s has an id of its own, and it's kid-sized",
    (id, p) => {
      // Not a pack, story or trio id: buildModel would find the wrong one.
      expect(getPuzzle(id)).toBeUndefined();
      expect(getStoryPuzzle(id)).toBeUndefined();
      expect(getTrioPuzzle(id)).toBeUndefined();
      // Small and chunky: a few colors, and no side longer than 8.
      expect(p.palette.length).toBeLessThanOrEqual(5);
      expect(Math.max(p.dims.x, p.dims.y, p.dims.z)).toBeLessThanOrEqual(8);
      expect(splitIntoBricks(p).length).toBeLessThanOrEqual(8);
    },
  );
});
