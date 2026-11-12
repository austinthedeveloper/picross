import '../../styles/settings.css';
import { gameHref } from '@picross/shared/game/boards';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { haptic, hapticsSupported } from '@picross/shared/ui/haptics';
import { applyTheme } from '@picross/shared/ui/theme';
import { getSettings, updateSettings, type Mode, type Settings } from '../../game/settings';

/** The settings that are on or off. */
type Flag = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

interface Switch {
  /** The setting it changes, and whether "on" means `true` (Sound is on when not muted). */
  key: Flag;
  invert?: boolean;
  label: string;
  hint: string;
  /** After the change: what else has to know. */
  changed?: (on: boolean) => void;
}

/** One on/off setting: a labeled switch, with what it does under its name. */
function switchRow({ key, invert, label, hint, changed }: Switch): HTMLElement {
  const id = `setting-${key}`;
  const isOn = () => getSettings()[key] !== Boolean(invert);
  const input = el('input', { type: 'checkbox', id, className: 'switch', checked: isOn() });
  input.setAttribute('role', 'switch');
  input.setAttribute('aria-labelledby', `${id}-label`);
  input.setAttribute('aria-describedby', `${id}-hint`);
  const state = el('span', { className: 'switch-state', ariaHidden: 'true' });
  const show = () => (state.textContent = input.checked ? 'On' : 'Off');
  input.onchange = () => {
    const patch: Partial<Settings> = {};
    patch[key] = input.checked !== Boolean(invert);
    updateSettings(patch);
    show();
    changed?.(input.checked);
  };
  show();
  return el('label', { className: 'setting', htmlFor: id }, [
    el('span', { className: 'setting-text' }, [
      el('span', { className: 'setting-label', id: `${id}-label`, textContent: label }),
      el('span', { className: 'setting-hint', id: `${id}-hint`, textContent: hint }),
    ]),
    state,
    input,
  ]);
}

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'relaxed', label: 'Relaxed', hint: 'Nothing is checked. Solve at your own pace.' },
  {
    id: 'hearts',
    label: '♥ Hearts',
    hint: 'A wrong move costs a heart. On a run it’s Hits on: mistakes and powers hurt.',
  },
];

/** Relaxed or Hearts: one choice of two, as radio buttons. */
function modeChoice(): HTMLElement {
  const options = MODES.map(({ id, label, hint }) => {
    const input = el('input', {
      type: 'radio',
      name: 'setting-mode',
      id: `setting-mode-${id}`,
      value: id,
      checked: getSettings().mode === id,
      onchange: () => updateSettings({ mode: id }),
    });
    input.setAttribute('aria-labelledby', `${input.id}-label`);
    input.setAttribute('aria-describedby', `${input.id}-hint`);
    return el('label', { className: 'mode-option', htmlFor: input.id }, [
      input,
      el('span', { className: 'setting-text' }, [
        el('span', { className: 'setting-label', id: `${input.id}-label`, textContent: label }),
        el('span', { className: 'setting-hint', id: `${input.id}-hint`, textContent: hint }),
      ]),
    ]);
  });
  return el('fieldset', { className: 'setting mode-setting' }, [
    el('legend', { className: 'setting-label', textContent: 'Mode' }),
    el('p', {
      className: 'setting-hint',
      textContent: 'What free play, the daily and new runs start in. The lists can change it too.',
    }),
    el('div', { className: 'mode-options' }, options),
  ]);
}

function group(title: string, rows: HTMLElement[]): HTMLElement {
  const id = `settings-${title.toLowerCase()}`;
  const section = el('section', { className: 'settings-group' }, [
    el('h2', { id, textContent: title }),
    el('div', { className: 'settings-rows' }, rows),
  ]);
  section.setAttribute('aria-labelledby', id);
  return section;
}

/**
 * Both games' settings at #/settings (#154): one save (`game/settings.ts`), so a change here
 * is the same change on both boards, which read it as they draw. Grouped General (both
 * games') and Cubed (the block's own). The 2D game has no settings of its own, only the
 * list's filters and order, which stay on its list; so there's no Flat group.
 */
export function renderSettingsScreen(app: HTMLElement): void {
  // A phone setting: only shown on a touch screen with some way to buzz (as on the list).
  const canBuzz = hapticsSupported() && matchMedia('(pointer: coarse)').matches;
  const general = [
    switchRow({
      key: 'muted',
      invert: true,
      label: 'Sound',
      hint: 'Sound effects as you play. Each board’s speaker button changes this too.',
    }),
    ...(canBuzz
      ? [
          switchRow({
            key: 'haptics',
            label: 'Haptics',
            hint: 'Buzzes on taps, finished lines and hits.',
            // Turning them on buzzes, so you know they work.
            changed: (on) => {
              if (on) haptic('tap');
            },
          }),
        ]
      : []),
    switchRow({
      key: 'highContrast',
      label: 'High contrast',
      hint: 'Black and white, with stronger lines, on every screen.',
      changed: () => applyTheme(),
    }),
    modeChoice(),
    el('p', {
      className: 'settings-note',
      textContent: 'Light or dark, and reduced motion, follow your device’s settings.',
    }),
  ];
  const cubed = [
    switchRow({
      key: 'dimDone',
      label: 'Fade finished clues',
      hint: 'A line’s clue fades once the line is done.',
    }),
    el('div', { className: 'setting' }, [
      el('span', { className: 'setting-text' }, [
        el('span', { className: 'setting-label', textContent: 'Tutorial' }),
        el('span', {
          className: 'setting-hint',
          textContent: 'Learn the clues on a little block again, one step at a time.',
        }),
      ]),
      el('a', {
        className: 'button ghost',
        href: `${gameHref('cubed')}/tutorial`,
        textContent: 'Play the tutorial',
      }),
    ]),
  ];
  app.replaceChildren(
    el('main', { className: 'screen settings-screen' }, [
      el('header', { className: 'topbar' }, [
        // Back to whichever game's list you came from.
        homeLink(),
        el('h1', { textContent: 'Settings' }),
      ]),
      group('General', general),
      group('Cubed', cubed),
    ]),
  );
}
