import { el } from '@picross/shared/ui/dom';
import type { GameKind } from '@picross/shared/game/boards';

const TABS: { id: GameKind; label: string; hint: string }[] = [
  { id: 'flat', label: 'Flat', hint: '2D grids' },
  { id: 'cubed', label: 'Cubed', hint: '3D blocks' },
];

/**
 * Flat | Cubed tabs, for a screen where the board matters (#152): free play and the
 * editor. Each tab is a link to its own route (`href`); `current` is the one showing. It
 * has the old Flat | Cubed switch's look (`.game-switch`, base.css).
 */
export function boardTabs(
  current: GameKind,
  href: (tab: GameKind) => string,
  className = '',
): HTMLElement {
  return el(
    'nav',
    { className: `game-switch board-tabs ${className}`.trim(), ariaLabel: 'Board' },
    TABS.map(({ id, label, hint }) => {
      const link = el('a', { className: 'game-option', href: href(id) }, [
        el('span', { className: 'game-label', textContent: label }),
        el('span', { className: 'game-hint', textContent: hint }),
      ]);
      if (id === current) link.setAttribute('aria-current', 'page');
      return link;
    }),
  );
}
