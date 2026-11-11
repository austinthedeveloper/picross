import { el } from '@picross/shared/ui/dom';

/** The way to the one settings screen (#154), from either game's list. */
export const settingsLink = () =>
  el('a', { className: 'button ghost settings-link', href: '#/settings' }, [
    el('span', { textContent: '⚙', ariaHidden: 'true' }),
    'Settings',
  ]);
