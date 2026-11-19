import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { getPuzzle } from './index';
import { TRIO_PICTURES } from './trio';

// The trio's pictures (draw, carve, build) are played like any other 2D puzzle.
describe('trio pictures', () => {
  it.each(TRIO_PICTURES.map((p) => [p.id, p] as const))(
    '%s has one solution reachable without guessing',
    (_, p) => {
      const result = solve(p.width, p.height, p.clues);
      expect(result.status).toBe('unique');
    },
  );

  it.each(TRIO_PICTURES.map((p) => [p.id] as const))("%s doesn't clash with the pack", (id) => {
    expect(getPuzzle(id)).toBeUndefined();
  });
});
