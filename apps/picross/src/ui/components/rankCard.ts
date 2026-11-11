import { badgeCount } from '../../game/badges';
import { currentPoints, rankProgress } from '../../game/rank';
import { el } from '@picross/shared/ui/dom';
import { plural } from '../format';

/** Your free-play rank (#106) and the way to your badges (#109), for the puzzle list. */
export function rankCard(): HTMLElement {
  const { rank, next, points, fraction } = rankProgress(currentPoints());
  const total = plural(points, 'point').replace(/^\d+/, points.toLocaleString());
  const progress = next
    ? `${total} · ${(next.points - points).toLocaleString()} to ${next.name}`
    : `${total} · the top rank`;
  const { earned, total: badges } = badgeCount();
  return el('section', { className: 'rank-card', ariaLabel: 'Rank' }, [
    el('div', { className: 'rank-title' }, [
      el('span', { className: 'rank-kicker', textContent: 'Rank' }),
      el('strong', { className: 'rank-name', textContent: rank.name }),
    ]),
    el('progress', {
      className: 'rank-bar',
      max: 1,
      value: fraction,
      ariaLabel: `Progress to ${next?.name ?? 'the top rank'}`,
    }),
    el('div', { className: 'rank-meta' }, [
      el('span', { className: 'rank-progress', textContent: progress }),
      el('a', {
        className: 'rank-badges',
        href: '#/badges',
        textContent: `Badges ${earned}/${badges} →`,
      }),
    ]),
  ]);
}
