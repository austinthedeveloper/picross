import { readStore, writeStore } from './storage';

/** Relaxed never checks what you break; hearts mode costs a heart for breaking a cube of the shape. */
export type Mode = 'relaxed' | 'hearts';

export interface Settings {
  mode: Mode;
  muted: boolean;
  highContrast: boolean;
  /** Vibrates on taps, finished lines, and mistakes, where the phone can. Separate from mute. */
  haptics: boolean;
}

// Its own key, so it never mixes with the 2D game's settings on the same site.
const KEY = 'picross3d:settings';
const settings: Settings = readStore<Settings>(KEY, {
  mode: 'relaxed',
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
