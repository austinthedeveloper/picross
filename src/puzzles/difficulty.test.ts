import { describe, expect, it } from 'vitest';
import { linePasses } from '../engine/solver';
import { DIFFICULTIES, difficultyOf, puzzleDifficulty, puzzlePasses } from './difficulty';
import { puzzles } from './index';
import ratings from './ratings.json';

describe('difficultyOf', () => {
  it('starts each band at its cutoff', () => {
    expect([1, 2, 3, 4, 5, 7, 8, 10, 11, 17].map((passes) => difficultyOf(passes).label)).toEqual([
      'Easy',
      'Easy',
      'Medium',
      'Medium',
      'Hard',
      'Hard',
      'Expert',
      'Expert',
      'Insane',
      'Insane',
    ]);
  });

  it('covers every number of passes, hardest last', () => {
    expect(DIFFICULTIES[0].passes).toBe(0);
    DIFFICULTIES.slice(1).forEach((band, i) => {
      expect(band.passes).toBeGreaterThan(DIFFICULTIES[i].passes);
    });
  });
});

describe('the saved ratings', () => {
  it('match what the solver says about every puzzle', () => {
    // If this fails after adding or changing puzzles, run `npm run rate:puzzles`.
    for (const p of puzzles) {
      expect(puzzlePasses(p.id), p.id).toBe(linePasses(p.width, p.height, p.clues));
    }
  });

  it('hold nothing but pack puzzles', () => {
    const ids = new Set(puzzles.map((p) => p.id));
    expect(Object.keys(ratings).filter((id) => !ids.has(id))).toEqual([]);
    expect(Object.keys(ratings)).toHaveLength(puzzles.length);
  });

  it('put puzzles in every band, with Insane kept rare', () => {
    const count = (id: string) => puzzles.filter((p) => puzzleDifficulty(p.id).id === id).length;
    for (const band of DIFFICULTIES) expect(count(band.id), band.id).toBeGreaterThan(0);
    expect(count('insane')).toBeLessThan(puzzles.length / 20);
  });
});
