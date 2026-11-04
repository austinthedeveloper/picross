import { readStore, writeStore } from './storage';

/** Relaxed never checks fills; hearts mode costs a heart for each wrong fill. */
export type Mode = 'relaxed' | 'hearts';

/** Which puzzles the list shows. A puzzle in progress counts as not completed. */
export type ListFilter = 'all' | 'todo' | 'done';

export function passesFilter(filter: ListFilter, completed: boolean): boolean {
  return filter === 'all' || (filter === 'done') === completed;
}

export interface Settings {
  mode: Mode;
  listFilter: ListFilter;
  muted: boolean;
  highContrast: boolean;
}

const KEY = 'picross:settings';
const settings: Settings = readStore<Settings>(KEY, {
  mode: 'relaxed',
  listFilter: 'all',
  // Sound starts off; the speaker button turns it on.
  muted: true,
  highContrast: false,
});

export function getSettings(): Readonly<Settings> {
  return settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  writeStore(KEY, settings);
}
