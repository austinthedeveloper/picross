import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { TRIO_PUZZLES } from './trio';

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
});
