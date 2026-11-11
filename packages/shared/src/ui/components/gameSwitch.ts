import { el } from '../dom';

/**
 * The switch between the two games in one app: Flat (the 2D game, at `#/`) and Cubed (the
 * 3D game, under `#/cubed`). Shared with the 3D game's screens, so both show the same
 * switch. It remembers the last one picked, so the app opens on it next time.
 */
export type GameKind = 'flat' | 'cubed';

const KEY = 'picross:game';

/** Each game's home. */
const HREF: Record<GameKind, string> = { flat: '#/', cubed: '#/cubed' };

export function gameHref(target: GameKind): string {
  return HREF[target];
}

export function lastGame(): GameKind | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'flat' || value === 'cubed' ? value : null;
  } catch {
    return null;
  }
}

export function rememberGame(kind: GameKind): void {
  try {
    localStorage.setItem(KEY, kind);
  } catch {
    // Storage blocked: the site just opens on Flat.
  }
}

/** "Flat | Cubed" at the top of a game's home screen; `current` is the one you're in. */
export function gameSwitch(current: GameKind): HTMLElement {
  rememberGame(current);
  const option = (kind: GameKind, label: string, hint: string) => {
    const link = el(
      'a',
      {
        className: 'game-option',
        href: gameHref(kind),
        title: hint,
      },
      [
        el('span', { className: 'game-label', textContent: label }),
        el('span', { className: 'game-hint', textContent: hint }),
      ],
    );
    if (kind === current) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', () => rememberGame(kind));
    return link;
  };
  return el('nav', { className: 'game-switch', ariaLabel: 'Game' }, [
    option('flat', 'Flat', '2D grids'),
    option('cubed', 'Cubed', '3D blocks'),
  ]);
}
