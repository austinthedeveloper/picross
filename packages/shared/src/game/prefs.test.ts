import { afterEach, describe, expect, it } from 'vitest';
import { getPrefs, providePrefs, updatePrefs, type Prefs } from './prefs';

afterEach(() => providePrefs());

describe('prefs', () => {
  it('starts with the default prefs in memory', () => {
    expect(getPrefs()).toEqual({ muted: true, highContrast: false, haptics: true });
    updatePrefs({ muted: false });
    expect(getPrefs().muted).toBe(false);
  });

  it('reads and writes through the source a game provides', () => {
    const settings: Prefs & { mode: string } = {
      mode: 'hearts',
      muted: false,
      highContrast: true,
      haptics: false,
    };
    providePrefs({ get: () => settings, update: (patch) => Object.assign(settings, patch) });
    expect(getPrefs().highContrast).toBe(true);
    updatePrefs({ muted: true });
    expect(settings).toEqual({ mode: 'hearts', muted: true, highContrast: true, haptics: false });
  });

  it('goes back to fresh defaults when the source is taken away', () => {
    updatePrefs({ haptics: false });
    providePrefs();
    expect(getPrefs().haptics).toBe(true);
  });
});
