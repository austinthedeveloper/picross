import { badgeNote, earnFromStats } from '../../../game/badges';
import { rankUpNote } from '../../../game/rank';
import { el } from '@picross/shared/ui/dom';

/**
 * What a solve or a run on the Cubed board earned toward the one rank and the one badge
 * shelf (#157), said on its end panel: "New rank: Fixer! Badge earned: Block Breaker
 * (Bronze)!" Call it after the result is recorded, with the points from before.
 */
export function earnedNote(pointsBefore?: number): HTMLElement[] {
  const rank = pointsBefore === undefined ? '' : rankUpNote(pointsBefore);
  const text = [rank, badgeNote(earnFromStats())].filter(Boolean).join(' ');
  return text ? [el('p', { className: 'end-note earned-note', textContent: text })] : [];
}
