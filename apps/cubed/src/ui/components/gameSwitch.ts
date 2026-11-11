import { el } from '../dom';

/**
 * The switch between the two games on one site: Flat (this 2D game, at the site's root) and
 * Cubed (the 3D game, under /3d/). Shared with the 3D game, so both show the same switch.
 * It remembers the last one picked, so the site opens on it next time.
 */
export type GameKind = 'flat' | 'cubed';

const KEY = 'picross:game';

/** Where each game lives, seen from the other. In dev each has its own server. */
const HREF: Record<GameKind, { fromFlat: string; fromCubed: string }> = {
  flat: { fromFlat: './', fromCubed: '../' },
  cubed: { fromFlat: './3d/', fromCubed: './' },
};
const DEV_HREF: Record<GameKind, string> = {
  flat: 'http://localhost:5173/',
  cubed: 'http://localhost:5174/',
};

export function gameHref(target: GameKind, from: GameKind): string {
  if (import.meta.env.DEV) return DEV_HREF[target];
  return from === 'flat' ? HREF[target].fromFlat : HREF[target].fromCubed;
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
        href: kind === current ? '#/' : gameHref(kind, current),
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
