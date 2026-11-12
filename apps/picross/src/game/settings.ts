import type { Mode } from '@picross/grid/game/game';
import type { Difficulty } from '@picross/grid/puzzles/difficulty';
import type { GameKind } from '@picross/shared/game/boards';
import type { SizeBand } from './freePlay';
import { readStore, writeStore } from '@picross/shared/game/storage';

// Relaxed or hearts: the mode new puzzles start in. The game (packages/grid) defines them.
export type { Mode };

/** Which puzzles the list shows. A puzzle in progress counts as not completed. */
export type ListFilter = 'all' | 'todo' | 'done';

export function passesFilter(filter: ListFilter, completed: boolean): boolean {
  return filter === 'all' || (filter === 'done') === completed;
}

/**
 * How the list runs: smallest puzzles first, or the whole thing reversed. Easiest
 * and hardest keep to that size order and sort within each size (#112).
 */
export type ListOrder = 'asc' | 'desc' | 'easiest' | 'hardest';

/** Puts items that are already smallest-first into the chosen order. */
export function inListOrder<T>(order: ListOrder, items: readonly T[]): T[] {
  return order === 'desc' || order === 'hardest' ? [...items].reverse() : [...items];
}

/** Puts one size's puzzles, already in pack order, into the chosen order. */
export function inPuzzleOrder<T>(
  order: ListOrder,
  items: readonly T[],
  passes: (item: T) => number,
): T[] {
  if (order === 'asc' || order === 'desc') return inListOrder(order, items);
  const sign = order === 'easiest' ? 1 : -1;
  return [...items].sort((a, b) => sign * (passes(a) - passes(b)));
}

/** Which difficulty the list shows (#112): a band's id, or 'any'. */
export type DifficultyFilter = Difficulty | 'any';

export interface Settings {
  mode: Mode;
  listFilter: ListFilter;
  listOrder: ListOrder;
  listDifficulty: DifficultyFilter;
  /** Ids of the puzzle list sections the player has closed. */
  collapsedSections: string[];
  muted: boolean;
  highContrast: boolean;
  /** Vibrates on taps, finished lines, and hits, where the phone can. Separate from mute. */
  haptics: boolean;
  /** Fade the clues of finished lines, on a block (Cubed's setting, #155). */
  dimDone: boolean;
  /** Cubed's guided tutorial was finished or skipped. */
  cubedTutorialDone: boolean;
  /** Which free-play list opens (#153): the last game played, from `picross:game`. */
  freePlayTab: GameKind;
  /** Free play's size filter, on either tab (#153). The home lists group by size instead. */
  listSize: SizeBand;
  /** Free play's Next unsolved and Surprise me pick from both boards, not just the tab's. */
  pickBoth: boolean;
}

/**
 * Both games' settings (#154, #155). The first-launch merge (`migrate.ts`) moved Cubed's
 * `picross3d:settings` in; Cubed's routes read them through `cubed/game/settings.ts`.
 */
export const SETTINGS_KEY = 'picross:settings';
const KEY = SETTINGS_KEY;
const settings: Settings = readStore<Settings>(KEY, {
  mode: 'relaxed',
  listFilter: 'all',
  listOrder: 'asc',
  listDifficulty: 'any',
  collapsedSections: [],
  // Sound starts off; the speaker button turns it on.
  muted: true,
  highContrast: false,
  // Unlike sound, haptics start on: they're silent, so they never surprise anyone nearby.
  haptics: true,
  dimDone: true,
  cubedTutorialDone: false,
  freePlayTab: 'flat',
  listSize: 'any',
  pickBoth: false,
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
