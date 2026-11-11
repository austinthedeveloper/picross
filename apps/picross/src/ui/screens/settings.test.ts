import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { providePrefs } from '@picross/shared/game/prefs';
import { getSettings, SETTINGS_KEY, updateSettings } from '../../game/settings';
import { renderSettingsScreen } from './settings';

const DEFAULTS = {
  mode: 'relaxed',
  muted: true,
  highContrast: false,
  haptics: true,
  dimDone: true,
} as const;

let app: HTMLElement;
const draw = () => renderSettingsScreen(app);
const switchFor = (name: string) => {
  const label = [...app.querySelectorAll('.setting-label')].find((l) => l.textContent === name);
  return app.querySelector<HTMLInputElement>(`[role="switch"][aria-labelledby="${label?.id}"]`);
};
const flip = (input: HTMLInputElement | null) => {
  input!.click(); // a click checks it and fires change, as Space does
};
const saved = () => JSON.parse(localStorage.getItem(SETTINGS_KEY)!);

beforeEach(() => {
  // The app hands shared code (the theme, sound, haptics) the one settings save (main.ts).
  providePrefs({ get: getSettings, update: updateSettings });
  updateSettings(DEFAULTS);
  localStorage.removeItem('picross:game');
  delete document.documentElement.dataset.contrast;
  app = document.createElement('div');
  document.body.replaceChildren(app);
});

afterEach(() => {
  vi.unstubAllGlobals();
  providePrefs();
});

describe('the settings screen', () => {
  it('groups General and Cubed, with no Flat group (the 2D game has none of its own)', () => {
    draw();
    const groups = [...app.querySelectorAll('.settings-group h2')].map((h) => h.textContent);
    expect(groups).toEqual(['General', 'Cubed']);
    for (const name of ['Sound', 'High contrast', 'Fade finished clues']) {
      expect(switchFor(name), name).not.toBeNull();
    }
    // Every switch is named by its label and described by its hint.
    for (const input of app.querySelectorAll('[role="switch"]')) {
      const label = document.getElementById(input.getAttribute('aria-labelledby')!);
      const hint = document.getElementById(input.getAttribute('aria-describedby')!);
      expect(label?.textContent).toBeTruthy();
      expect(hint?.textContent).toBeTruthy();
    }
  });

  it('says reduced motion and light or dark follow the device', () => {
    draw();
    expect(app.querySelector('.settings-note')?.textContent).toMatch(/reduced motion/);
  });

  it('Sound is on when not muted, and saves at once', () => {
    draw();
    const sound = switchFor('Sound')!;
    expect(sound.checked).toBe(false);
    flip(sound);
    expect(getSettings().muted).toBe(false);
    expect(saved().muted).toBe(false);
    expect(sound.closest('.setting')?.querySelector('.switch-state')?.textContent).toBe('On');
  });

  it('High contrast changes the theme straight away', () => {
    draw();
    flip(switchFor('High contrast'));
    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(saved().highContrast).toBe(true);
    flip(switchFor('High contrast'));
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it('Fade finished clues is the one dimDone', () => {
    draw();
    flip(switchFor('Fade finished clues'));
    expect(getSettings().dimDone).toBe(false);
    expect(saved().dimDone).toBe(false);
  });

  it('shows Haptics only on a touch screen that can buzz, and buzzes when turned on', () => {
    draw();
    expect(switchFor('Haptics')).toBeNull();

    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
    updateSettings({ haptics: false });
    draw();
    const haptics = switchFor('Haptics')!;
    expect(haptics.checked).toBe(false);
    flip(haptics);
    expect(getSettings().haptics).toBe(true);
    expect(vibrate).toHaveBeenCalled();
  });

  it('the mode is one of two radio buttons', () => {
    updateSettings({ mode: 'hearts' });
    draw();
    const radios = [...app.querySelectorAll<HTMLInputElement>('input[name="setting-mode"]')];
    expect(radios.map((r) => [r.value, r.checked])).toEqual([
      ['relaxed', false],
      ['hearts', true],
    ]);
    expect(app.querySelector('fieldset legend')?.textContent).toBe('Mode');
    radios[0].click();
    expect(getSettings().mode).toBe('relaxed');
  });

  it("links to Cubed's tutorial, and Home goes back to the game played last", () => {
    draw();
    const tutorial = [...app.querySelectorAll('a')].find((a) => /tutorial/i.test(a.textContent!));
    expect(tutorial?.getAttribute('href')).toBe('#/cubed/tutorial');
    expect(app.querySelector('.home-link')?.getAttribute('href')).toBe('#/');
    localStorage.setItem('picross:game', 'cubed');
    draw();
    expect(app.querySelector('.home-link')?.getAttribute('href')).toBe('#/cubed');
  });
});
