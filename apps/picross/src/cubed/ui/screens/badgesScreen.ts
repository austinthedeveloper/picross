import { BADGES, markBadgesSeen, newBadges, nextStep, tierOf, TIERS } from '../../game/badges';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { cubedHref } from '../../href';

/** Every badge, its tier and what's next (#/cubed/badges). Opening it clears the "new" marks. */
export function renderBadgesScreen(root: HTMLElement): void {
  const fresh = new Set(newBadges().map((b) => b.id));
  markBadgesSeen();
  root.replaceChildren(
    el('div', { className: 'screen badges' }, [
      el('header', { className: 'topbar' }, [
        homeLink(cubedHref()),
        el('h1', { textContent: 'Badges' }),
      ]),
      el(
        'ul',
        { className: 'badge-list' },
        BADGES.map((b) => {
          const value = b.value();
          const tier = tierOf(b, value);
          return el('li', { className: `badge-row${tier >= 0 ? ` tier-${tier}` : ' locked'}` }, [
            el('span', { className: 'badge-icon', ariaHidden: 'true', textContent: b.icon }),
            el('span', { className: 'badge-text' }, [
              el('strong', { textContent: b.name }),
              ...(tier >= 0
                ? [el('span', { className: 'badge-tier', textContent: TIERS[tier] })]
                : []),
              ...(fresh.has(b.id)
                ? [el('span', { className: 'badge-new', textContent: 'New!' })]
                : []),
              el('span', {
                className: 'badge-how',
                textContent: `${b.how}. ${nextStep(b, value)}.`,
              }),
            ]),
          ]);
        }),
      ),
    ]),
  );
}

/** The list's link to badges, with how many are new. */
export function badgesLink(): HTMLElement {
  const n = newBadges().length;
  return el('a', {
    className: 'button ghost',
    href: cubedHref('/badges'),
    textContent: n ? `Badges (${n} new)` : 'Badges',
  });
}
