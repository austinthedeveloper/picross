import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { puzzles } from './index';

// Run in CI via `npm test`, or alone with `npm run check:puzzles`.
describe('puzzle pack uniqueness', () => {
  it.each(puzzles.map((p) => [p.id, p] as const))(
    '%s has one solution reachable without guessing',
    (_, p) => {
      const result = solve(p.width, p.height, p.clues);
      expect(result.status).toBe('unique');
      if (result.status === 'unique') {
        expect(result.grid.map(Boolean)).toEqual(p.solution.cells);
      }
    },
  );
});
