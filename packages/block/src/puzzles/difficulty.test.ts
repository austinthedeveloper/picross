import { describe, expect, it } from 'vitest';
import { difficultyOf } from './difficulty';

const at = (passes: number, side = 5) =>
  difficultyOf({ passes, dims: { x: side, y: side, z: side } }).id;

describe('difficulty', () => {
  it('bands by solver passes', () => {
    expect([at(2), at(3), at(4), at(5), at(6), at(8), at(9), at(12), at(13), at(20)]).toEqual([
      'easy',
      'easy',
      'medium',
      'medium',
      'hard',
      'hard',
      'expert',
      'expert',
      'insane',
      'insane',
    ]);
  });

  it('moves big blocks up a band, but not past Expert: Insane is by passes alone', () => {
    expect(at(3, 9)).toBe('medium');
    expect(at(9, 10)).toBe('expert');
    expect(at(12, 10)).toBe('expert');
    expect(at(13, 10)).toBe('insane');
    expect(at(13, 4)).toBe('insane');
  });
});
