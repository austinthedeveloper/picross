import { describe, expect, it } from 'vitest';
import { fakeClue, fakeClues } from './fakes';

describe('fakeClue', () => {
  it.each([
    [[2, 3], 10, [6]], // merges two runs first
    [[5], 10, [3, 1]], // then splits a long run
    [[1], 10, [2]], // then lengthens
    [[], 10, [1]], // an empty line gets a run
    [[1], 1, []], // a full one-cell line loses its run
    [[2], 2, [1]], // a full line can't grow, so it shrinks
  ])('%j in a line of %i becomes %j', (clue, length, fake) => {
    expect(fakeClue(clue, length)).toEqual(fake);
  });

  it('always fits the line and differs from the real clue', () => {
    for (const clue of [[1, 1, 1, 1, 1], [9], [2, 2, 2], [3, 1, 4]]) {
      const fake = fakeClue(clue, 9);
      expect(fake.join()).not.toBe(clue.join());
      expect(fake.reduce((a, b) => a + b, 0) + fake.length - 1).toBeLessThanOrEqual(9);
    }
  });
});

describe('fakeClues', () => {
  it('keys each forged line by its id', () => {
    const shown = fakeClues(
      3,
      3,
      { rows: [[3], [1], []], cols: [[1], [2], [1]] },
      {
        rows: [0],
        cols: [1],
      },
    );
    expect([...shown]).toEqual([
      ['r0', [1, 1]],
      ['c1', [3]],
    ]);
  });
});
