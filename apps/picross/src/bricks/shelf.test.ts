import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BRICKS_KEY,
  clearProgress,
  clearShelf,
  getShelf,
  isBuilt,
  putOnShelf,
  savedLayer,
  saveLayer,
} from './shelf';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('the shelf', () => {
  it('starts empty', () => {
    expect(getShelf()).toEqual([]);
    expect(isBuilt('car')).toBe(false);
  });

  it('keeps toys in the order they were first built, with their pictures', () => {
    putOnShelf('car', 'data:car');
    putOnShelf('jack', 'data:jack');
    putOnShelf('car', 'data:car-2');
    expect(getShelf()).toEqual([
      { id: 'car', times: 2, picture: 'data:car-2' },
      { id: 'jack', times: 1, picture: 'data:jack' },
    ]);
    expect(isBuilt('jack')).toBe(true);
  });

  it('a build in progress picks up on its layer, until it’s built or started over', () => {
    expect(savedLayer('dog')).toBe(0);
    saveLayer('dog', 3);
    expect(savedLayer('dog')).toBe(3);
    clearProgress('dog');
    expect(savedLayer('dog')).toBe(0);
    saveLayer('dog', 5);
    putOnShelf('dog');
    expect(savedLayer('dog')).toBe(0);
  });

  it('clearing it takes every toy off, and every build back to the start', () => {
    putOnShelf('car', 'data:car');
    saveLayer('dog', 2);
    clearShelf();
    expect(getShelf()).toEqual([]);
    expect(savedLayer('dog')).toBe(0);
  });

  it('when storage is full the older pictures go first, then the newest', () => {
    putOnShelf('car', 'data:car');
    const setItem = Storage.prototype.setItem;
    // Full: anything with two pictures in it doesn't fit.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if ((value.match(/data:/g) ?? []).length > 1) throw new Error('QuotaExceededError');
      setItem.call(this, key, value);
    });
    putOnShelf('jack', 'data:jack');
    expect(getShelf()).toEqual([
      { id: 'car', times: 1 },
      { id: 'jack', times: 1, picture: 'data:jack' },
    ]);
    expect(JSON.parse(localStorage.getItem(BRICKS_KEY)!).shelf).toHaveLength(2);
  });

  it('reads a broken save as an empty one', () => {
    localStorage.setItem(BRICKS_KEY, '{nope');
    expect(getShelf()).toEqual([]);
  });
});
