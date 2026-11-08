import { describe, expect, it } from 'vitest';
import { difficultyOf } from './difficulty';

const at = (passes: number, side = 5) =>
  difficultyOf({ passes, dims: { x: side, y: side, z: side } }).id;

describe('difficulty', () => {
  it('bands by solver passes', () => {
    expect([at(2), at(3), at(4), at(5), at(6), at(8), at(9)]).toEqual([
      'easy',
      'easy',
      'medium',
      'medium',
      'hard',
      'hard',
      'expert',
    ]);
  });

  it('moves big blocks up a band, but not past Expert', () => {
    expect(at(3, 9)).toBe('medium');
    expect(at(12, 10)).toBe('expert');
  });
});
