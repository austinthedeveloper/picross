import { readStore, writeStore } from './storage';

/** Relaxed never checks fills; hearts mode costs a heart for each wrong fill. */
export type Mode = 'relaxed' | 'hearts';

/** Which puzzles the list shows. A puzzle in progress counts as not completed. */
export type ListFilter = 'all' | 'todo' | 'done';

export function passesFilter(filter: ListFilter, completed: boolean): boolean {
  return filter === 'all' || (filter === 'done') === completed;
}

/** How the list runs: smallest puzzles first, or the whole thing reversed. */
export type ListOrder = 'asc' | 'desc';

/** Puts items that are already smallest-first into the chosen order. */
export function inListOrder<T>(order: ListOrder, items: readonly T[]): T[] {
  return order === 'desc' ? [...items].reverse() : [...items];
}

export interface Settings {
  mode: Mode;
  listFilter: ListFilter;
  listOrder: ListOrder;
  /** Ids of the puzzle list sections the player has closed. */
  collapsedSections: string[];
  muted: boolean;
  highContrast: boolean;
}

const KEY = 'picross:settings';
const settings: Settings = readStore<Settings>(KEY, {
  mode: 'relaxed',
  listFilter: 'all',
  listOrder: 'asc',
  collapsedSections: [],
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

export function setSectionCollapsed(id: string, collapsed: boolean): void {
  const others = settings.collapsedSections.filter((section) => section !== id);
  updateSettings({ collapsedSections: collapsed ? [...others, id] : others });
}
