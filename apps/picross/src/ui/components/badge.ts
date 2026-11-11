import { newBadgeCount, newBadgeLine, tierLabel, type NewBadge } from '../../game/badges';
import { pictureOf, type Badge, type Tier } from '../../puzzles/badges';
import { createPicture } from '@picross/play-grid/ui/board/picture';
import { el } from '@picross/shared/ui/dom';

const PIXEL = 3;

/**
 * A badge's picture. The rim shows its tier, and a badge you don't have yet is
 * faded. Hidden from screen readers: whoever shows this also says it in words.
 */
export function badgeIcon(badge: Badge, state: { earned: boolean; tier?: Tier }): HTMLElement {
  const classes = ['badge-icon', state.earned ? 'earned' : 'unearned'];
  if (state.tier) classes.push(`tier-${state.tier}`);
  return el('span', { className: classes.join(' '), ariaHidden: 'true' }, [
    createPicture(pictureOf(badge), PIXEL),
  ]);
}

/** The faded "?" for a badge that would spoil the story. */
export const hiddenBadgeIcon = () =>
  el('span', { className: 'badge-icon unearned', ariaHidden: 'true', textContent: '?' });

/** Badges a run just earned, for the results screen, with a link to the shelf. */
export function earnedBadges(fresh: readonly NewBadge[]): HTMLElement[] {
  if (!fresh.length) return [];
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  requestAnimationFrame(() => (live.textContent = fresh.map(newBadgeLine).join(' ')));
  return [
    el('section', { className: 'badges-earned', ariaLabel: 'Badges earned' }, [
      ...fresh.map(({ badge, tier, upgraded }) =>
        el('div', { className: 'badge-row' }, [
          badgeIcon(badge, { earned: true, tier }),
          el('div', { className: 'badge-text' }, [
            el('span', {
              className: 'badge-kicker',
              textContent: upgraded ? 'Badge upgraded' : 'Badge earned',
            }),
            el('strong', { className: 'badge-name', textContent: badge.name }),
            ...(tier ? [tierTag(tier)] : []),
          ]),
        ]),
      ),
      el('a', { className: 'badges-link', href: '#/badges', textContent: 'All badges →' }),
      live,
    ]),
  ];
}

/** A tier in words, so color is never the only signal. */
export function tierTag(tier: Tier): HTMLElement {
  return el('span', { className: `badge-tier tier-${tier}`, textContent: tierLabel(tier) });
}

/** A link to the shelf that says how many badges are new: "Badges (2 new)". */
export function badgesLink(className = 'button ghost'): HTMLElement {
  const n = newBadgeCount();
  return el('a', { className, href: '#/badges', textContent: n ? `Badges (${n} new)` : 'Badges' });
}
