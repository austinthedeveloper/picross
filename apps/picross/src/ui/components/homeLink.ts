import { el } from '../dom';

/** The way back to the puzzle list, in the same spot at the top of every screen. */
export const homeLink = () =>
  el('a', { className: 'button ghost home-link', href: '#/', ariaLabel: 'Home' }, [
    el('span', { textContent: '⌂', ariaHidden: 'true' }),
    el('span', { className: 'home-label', textContent: 'Home', ariaHidden: 'true' }),
  ]);
