import { describe, expect, it } from 'vitest';
import { nextUnsolved, randomUnsolved } from './pickPuzzle';

const list = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
const solved =
  (...ids: string[]) =>
  (id: string) =>
    ids.includes(id);

describe('nextUnsolved', () => {
  it('takes the very next puzzle when nothing is solved', () => {
    expect(nextUnsolved(list, 'a', solved())?.id).toBe('b');
  });

  it('skips solved puzzles', () => {
    expect(nextUnsolved(list, 'a', solved('a', 'b', 'c'))?.id).toBe('d');
  });

  it('wraps around to the start of the pack', () => {
    expect(nextUnsolved(list, 'c', solved('c', 'd'))?.id).toBe('a');
  });

  it('never offers the puzzle you just played', () => {
    expect(nextUnsolved(list, 'b', solved('a', 'c', 'd'))).toBeNull();
  });

  it('is null when nothing is left', () => {
    expect(nextUnsolved(list, 'b', solved('a', 'b', 'c', 'd'))).toBeNull();
  });

  it('starts from the top if the puzzle is not in the list', () => {
    expect(nextUnsolved(list, 'zzz', solved())?.id).toBe('a');
  });
});

describe('randomUnsolved', () => {
  it('only picks unsolved puzzles', () => {
    const isSolved = solved('a', 'c');
    expect(randomUnsolved(list, isSolved, () => 0)?.id).toBe('b');
    expect(randomUnsolved(list, isSolved, () => 0.999)?.id).toBe('d');
  });

  it('can land on any of them', () => {
    const picks = [0, 0.3, 0.6, 0.9].map((n) => randomUnsolved(list, solved(), () => n)?.id);
    expect(new Set(picks).size).toBe(4);
  });

  it('is null when everything is solved', () => {
    expect(randomUnsolved(list, solved('a', 'b', 'c', 'd'))).toBeNull();
  });
});
