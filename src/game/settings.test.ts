import { describe, expect, it } from 'vitest';
import { getSettings, inListOrder, passesFilter, setSectionCollapsed } from './settings';

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

describe('inListOrder', () => {
  it('keeps smallest-first as it is', () => {
    expect(inListOrder('asc', [5, 10, 15])).toEqual([5, 10, 15]);
  });

  it('reverses without touching the original', () => {
    const items = [5, 10, 15];
    expect(inListOrder('desc', items)).toEqual([15, 10, 5]);
    expect(items).toEqual([5, 10, 15]);
  });
});

describe('setSectionCollapsed', () => {
  it('closes and opens sections independently, without duplicates', () => {
    setSectionCollapsed('size-5', true);
    setSectionCollapsed('murals', true);
    setSectionCollapsed('size-5', true);
    expect(getSettings().collapsedSections).toEqual(['murals', 'size-5']);
    setSectionCollapsed('murals', false);
    expect(getSettings().collapsedSections).toEqual(['size-5']);
  });
});
