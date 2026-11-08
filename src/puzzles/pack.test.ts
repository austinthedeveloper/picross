import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { PUZZLES } from './index';

describe('the pack', () => {
  it('has puzzles with unique ids', () => {
    expect(PUZZLES.length).toBeGreaterThan(10);
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
  });

  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    '%s can be solved from the clues it shows, without guessing',
    (_, puzzle) => {
      const result = solve(puzzle.dims, puzzle.clues, undefined, puzzle.lines);
      expect(result.solved).toBe(true);
      // Run `npm run puzzles` after changing a puzzle to bring this up to date.
      expect(puzzle.passes).toBe(result.passes);
      result.known.forEach((k, cell) => expect(k === 1).toBe(puzzle.solution[cell] !== 0));
    },
  );
});
