/**
 * The settings shared code reads. Each game keeps its own settings (its own storage key
 * and fields), so it hands them over at startup: its `main.ts` calls `providePrefs` with
 * its `getSettings`/`updateSettings` before anything renders or plays a sound. Until then,
 * and in tests that don't provide any, these defaults (the games' own) live in memory.
 */
export interface Prefs {
  muted: boolean;
  highContrast: boolean;
  haptics: boolean;
}

export interface PrefsSource {
  get(): Readonly<Prefs>;
  update(patch: Partial<Prefs>): void;
}

function memory(): PrefsSource {
  // Sound starts off; haptics start on (they're silent).
  const prefs: Prefs = { muted: true, highContrast: false, haptics: true };
  return {
    get: () => prefs,
    update: (patch) => void Object.assign(prefs, patch),
  };
}

let source: PrefsSource = memory();

/** Reads and writes go to `next` from now on; with nothing, back to fresh defaults. */
export function providePrefs(next?: PrefsSource): void {
  source = next ?? memory();
}

export function getPrefs(): Readonly<Prefs> {
  return source.get();
}

export function updatePrefs(patch: Partial<Prefs>): void {
  source.update(patch);
}
