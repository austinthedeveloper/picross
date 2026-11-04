import { describe, expect, it } from 'vitest';
import { passesFilter } from './settings';

describe('passesFilter', () => {
  it('shows everything under "all"', () => {
    expect(passesFilter('all', true)).toBe(true);
    expect(passesFilter('all', false)).toBe(true);
  });

  it('splits completed from not completed', () => {
    expect(passesFilter('done', true)).toBe(true);
    expect(passesFilter('done', false)).toBe(false);
    expect(passesFilter('todo', true)).toBe(false);
    expect(passesFilter('todo', false)).toBe(true);
  });
});
