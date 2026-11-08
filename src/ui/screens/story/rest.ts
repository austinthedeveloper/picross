import { REST_LATE_HEAL, restHeal, type Rest } from '../../../story/data';
import { iconArt } from '../../art';
import { el } from '../../dom';
import { formatTime } from '../../format';
import type { Kind } from './encounter';
import { took } from './encounter';

/**
 * A rest stop: a small block against the clock. Solve it in time for the full heal; finish
 * late and heal a little. Like the 2D game's, the clock only decides the size of a heal:
 * it never costs HP. It follows the play clock, so it pauses with the page.
 */
export function restKind(rest: Rest): Kind {
  const clock = el('span', {
    className: 'rest-clock',
    textContent: formatTime(rest.seconds * 1000),
  });
  const status = el('span', {
    className: 'rest-status',
    textContent: `Catch your breath. Solve it in time for +${rest.heal} HP.`,
  });
  let timer = 0;
  return {
    mode: 'relaxed',
    header: el('section', { className: 'rest', ariaLabel: 'Rest stop' }, [
      el('span', { className: 'rest-icon', ariaHidden: 'true' }, [iconArt('rest')]),
      status,
      clock,
    ]),
    attach(play) {
      let late = false;
      const update = () => {
        const left = rest.seconds * 1000 - play.clock.elapsed;
        clock.textContent = formatTime(Math.max(0, left));
        clock.classList.toggle('low', left > 0 && left <= 15_000);
        if (left <= 0 && !late) {
          late = true;
          clock.classList.add('late');
          status.textContent = `Out of time. Finish anyway for +${REST_LATE_HEAL} HP.`;
        }
      };
      update();
      timer = window.setInterval(
        () => (play.game.solved ? window.clearInterval(timer) : update()),
        250,
      );
    },
    note: (game) =>
      `${restHeal(rest, game.elapsed) === rest.heal ? 'Rested' : 'Too slow for a full rest'} · ${took(game)}`,
    dispose: () => window.clearInterval(timer),
  };
}
