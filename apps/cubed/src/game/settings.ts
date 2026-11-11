import { readStore, writeStore } from '@picross/shared/game/storage';

/** Relaxed never checks what you break; hearts mode costs a heart for breaking a cube of the shape. */
export type Mode = 'relaxed' | 'hearts';

/** Which puzzles the list shows. A puzzle in progress counts as not done. */
export type ListFilter = 'all' | 'todo' | 'done';

export interface Settings {
  mode: Mode;
  listFilter: ListFilter;
  /** A difficulty band's id, or 'any'. */
  listDifficulty: string;
  /** Fade the clues of finished lines. */
  dimDone: boolean;
  /** The guided tutorial was finished or skipped. */
  tutorialDone: boolean;
  muted: boolean;
  highContrast: boolean;
  /** Vibrates on taps, finished lines, and mistakes, where the phone can. Separate from mute. */
  haptics: boolean;
}

// Its own key, so it never mixes with the 2D game's settings on the same site.
const KEY = 'picross3d:settings';
const settings: Settings = readStore<Settings>(KEY, {
  mode: 'relaxed',
  listFilter: 'all',
  listDifficulty: 'any',
  dimDone: true,
  tutorialDone: false,
  // Sound starts off; the speaker button turns it on.
  muted: true,
  highContrast: false,
  // Unlike sound, haptics start on: they're silent, so they never surprise anyone nearby.
  haptics: true,
});

export function getSettings(): Readonly<Settings> {
  return settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  writeStore(KEY, settings);
}
