import { readStore, writeStore } from './storage';

/** Relaxed never checks fills; hearts mode costs a heart for each wrong fill. */
export type Mode = 'relaxed' | 'hearts';

export interface Settings {
  mode: Mode;
  muted: boolean;
  highContrast: boolean;
}

const KEY = 'picross:settings';
const settings: Settings = readStore<Settings>(KEY, {
  mode: 'relaxed',
  muted: false,
  highContrast: false,
});

export function getSettings(): Readonly<Settings> {
  return settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  Object.assign(settings, patch);
  writeStore(KEY, settings);
}
