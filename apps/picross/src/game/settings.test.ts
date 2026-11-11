import { describe, expect, it, vi } from 'vitest';
import {
  getSettings,
  inListOrder,
  inPuzzleOrder,
  passesFilter,
  setSectionCollapsed,
} from './settings';

describe('inPuzzleOrder', () => {
  const list = [3, 1, 2];
  it('leaves pack order alone, or reverses it, when sorting by size', () => {
    expect(inPuzzleOrder('asc', list, (n) => n)).toEqual([3, 1, 2]);
    expect(inPuzzleOrder('desc', list, (n) => n)).toEqual([2, 1, 3]);
  });

  it('sorts by difficulty when asked, without changing the list', () => {
    expect(inPuzzleOrder('easiest', list, (n) => n)).toEqual([1, 2, 3]);
    expect(inPuzzleOrder('hardest', list, (n) => n)).toEqual([3, 2, 1]);
    expect(list).toEqual([3, 1, 2]);
  });

  it('keeps pack order among equally hard puzzles', () => {
    const tied = ['b', 'a', 'c'];
    expect(inPuzzleOrder('easiest', tied, () => 1)).toEqual(tied);
    expect(inPuzzleOrder('hardest', tied, () => 1)).toEqual(tied);
  });
});

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

describe('haptics', () => {
  // settings.ts reads storage once at import, so each load is a fresh module.
  async function load() {
    vi.resetModules();
    return import('./settings');
  }

  it('starts on, even though sound starts off, and is remembered', async () => {
    localStorage.clear();
    const fresh = await load();
    expect(fresh.getSettings()).toMatchObject({ haptics: true, muted: true });
    fresh.updateSettings({ haptics: false });
    expect((await load()).getSettings()).toMatchObject({ haptics: false, muted: true });
  });

  it('turns on for players whose settings were saved before it existed', async () => {
    localStorage.setItem('picross:settings', JSON.stringify({ muted: false, highContrast: true }));
    expect((await load()).getSettings()).toMatchObject({ haptics: true, muted: false });
  });
});
