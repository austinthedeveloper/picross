import { REST_LATE_HEAL, type Rest } from '../../../puzzles/runs';
import { iconArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '../../format';
import type { PlaySession } from '../gameScreen';

/**
 * A rest stop (#77): a small puzzle against the clock. Solve it before the
 * countdown ends for the full heal; finish late and you heal a little. The
 * countdown follows the game clock, so it pauses when the page is hidden and
 * resumes after a reload.
 */
export function restHooks(rest: Rest): Pick<PlaySession, 'header' | 'theme' | 'onBoard'> {
  const clock = el('span', {
    className: 'rest-clock',
    textContent: formatTime(rest.seconds * 1000),
  });
  const status = el('span', {
    className: 'rest-status',
    textContent: `Catch your breath. Solve it in time for +${rest.heal} HP.`,
  });
  const header = el('section', { className: 'rest', ariaLabel: 'Rest stop' }, [
    el('span', { className: 'rest-icon', ariaHidden: 'true' }, [iconArt('rest')]),
    status,
    clock,
  ]);

  return {
    header,
    theme: 'rest',
    onBoard(view, { game }) {
      let late = false;
      const update = () => {
        const left = rest.seconds * 1000 - game.elapsed;
        clock.textContent = formatTime(Math.max(0, left));
        clock.classList.toggle('low', left > 0 && left <= 15_000);
        if (left <= 0 && !late) {
          late = true;
          clock.classList.add('late');
          status.textContent = `Out of time. Finish anyway for +${REST_LATE_HEAL} HP.`;
        }
      };
      update();
      const timer = window.setInterval(() => {
        if (!view.root.isConnected || game.solved) window.clearInterval(timer);
        else update();
      }, 250);
    },
  };
}
