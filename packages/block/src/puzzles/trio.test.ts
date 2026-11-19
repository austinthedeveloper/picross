import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { getPuzzle, getStoryPuzzle } from './index';
import { TRIO_PUZZLES, buildModel } from './trio';

describe("the trio's blocks (draw, carve, build)", () => {
  it.each(TRIO_PUZZLES.map((p) => [p.id, p] as const))(
    '%s can be solved from the clues it shows, without guessing',
    (_, puzzle) => {
      const result = solve(puzzle.dims, puzzle.clues, undefined, puzzle.lines);
      expect(result.solved).toBe(true);
      // Run `npm -w packages/block run puzzles` after changing one to bring this up to date.
      expect(puzzle.passes).toBe(result.passes);
    },
  );

  it.each(TRIO_PUZZLES.map((p) => [p.id] as const))(
    "%s isn't a free-play or story id (it would shadow it in the build)",
    (id) => {
      expect(getPuzzle(id)).toBeUndefined();
      expect(getStoryPuzzle(id)).toBeUndefined();
    },
  );

  it('builds a pack puzzle too', () => {
    expect(buildModel('mug')?.id).toBe('mug');
  });
});
