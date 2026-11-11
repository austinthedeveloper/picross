import { describe, expect, it } from 'vitest';
import { Cell, type Solution } from './board';
import { deriveClues, lineClues, satisfiedClues } from './clues';

const { Empty: _, Filled: F, Marked: X } = Cell;

describe('lineClues', () => {
  it('counts runs', () => {
    expect(lineClues([true, true, false, true])).toEqual([2, 1]);
    expect(lineClues([false, true, true, true])).toEqual([3]);
  });

  it('returns no runs for an empty line', () => {
    expect(lineClues([false, false])).toEqual([]);
  });
});

describe('deriveClues', () => {
  it('derives row and column clues', () => {
    // ##.
    // .##
    const solution: Solution = {
      width: 3,
      height: 2,
      cells: [true, true, false, false, true, true],
    };
    expect(deriveClues(solution)).toEqual({
      rows: [[2], [2]],
      cols: [[1], [2], [1]],
    });
  });
});

describe('satisfiedClues', () => {
  it('satisfies every clue when the runs match exactly', () => {
    expect(satisfiedClues([F, F, _, F, _], [2, 1])).toEqual([true, true]);
  });

  it('locks in a run from the left edge', () => {
    expect(satisfiedClues([F, F, X, _, _, _], [2, 1])).toEqual([true, false]);
    expect(satisfiedClues([X, F, F, X, _, _], [2, 1])).toEqual([true, false]);
  });

  it('locks in a run from the right edge', () => {
    expect(satisfiedClues([_, _, _, X, F, F], [1, 2])).toEqual([false, true]);
  });

  it('does not satisfy a run that can still grow', () => {
    expect(satisfiedClues([F, F, _, _, _, _], [2, 1])).toEqual([false, false]);
  });

  it('does not satisfy a run with undecided cells before it', () => {
    expect(satisfiedClues([_, F, F, X, _, _], [2, 1])).toEqual([false, false]);
  });

  it('does not satisfy a run of the wrong length', () => {
    expect(satisfiedClues([F, F, F, X, _, _], [2, 1])).toEqual([false, false]);
  });
});
