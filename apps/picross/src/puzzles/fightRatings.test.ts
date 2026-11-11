import { describe, expect, it } from 'vitest';
import ratings from './fight-ratings.json';
import { rateFights, ratedFights } from './fightRatings';
import { runs } from './runs';

describe('the saved fight ratings (#168)', () => {
  it('match what the solvers say about every fight, on each board', () => {
    // If this fails after changing a fight, an enemy power, a battle or a solver, run
    // `npm run rate:fights` and check the diff says what you meant to change.
    expect(rateFights()).toEqual(ratings);
  });

  it('cover every story, Overtime and boss fight', () => {
    expect(Object.keys(ratings)).toEqual(ratedFights().map((e) => e.id));
  });

  it('have every fight solvable without guessing, with every power applied', () => {
    for (const [id, rating] of Object.entries(ratings)) {
      expect(rating.flat.status, id).toBe('unique');
      expect(rating.block?.status ?? 'unique', id).toBe('unique');
    }
  });

  it('keep the Curator the hardest story fight on the flat board', () => {
    // The ceiling before "Insane" (docs/architecture.md, "Difficulty"). Overtime is a
    // harder replay, so it may pass it. Blocks don't hold to this yet.
    const curator = ratings.curator.flat;
    for (const e of runs.flatMap((r) => r.encounters).filter((e) => e.enemy)) {
      const { passes, firstPass } = ratings[e.id as keyof typeof ratings].flat;
      expect(passes, e.id).toBeLessThanOrEqual(curator.passes);
      expect(firstPass, e.id).toBeGreaterThanOrEqual(curator.firstPass);
    }
  });
});
