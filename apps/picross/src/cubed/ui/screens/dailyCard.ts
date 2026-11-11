import { currentStreak, getDailyBoard, solvedOn } from '../../game/daily';
import { dailyDimension, dateKey } from '@picross/shared/puzzles/days';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '@picross/play-block/ui/format';

export const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * The daily puzzle's card on the list. There's one daily for both boards (#156), Flat and
 * Cubed by turns, so on a Flat day this opens the 2D game's board.
 */
export function dailyCard(): HTMLElement {
  const today = dateKey();
  const cubed = dailyDimension(today) === 'block';
  const solved = solvedOn(today);
  const streak = currentStreak(today);
  const keepGoing = streak ? ` Keep your ${plural(streak, 'day')} streak going.` : '';
  const text = solved
    ? `${solved.time === undefined ? 'Solved.' : `Solved in ${formatTime(solved.time)}.`} ${streak > 1 ? `${streak}-day streak!` : 'Come back tomorrow.'}`
    : cubed
      ? `${getDailyBoard(today) ? 'In progress.' : 'A new block every other day.'}${keepGoing}`
      : `Today's daily is a picture on the Flat board.${keepGoing}`;
  return el('a', { className: 'feature-card daily-card', href: '#/daily' }, [
    el('div', {}, [
      el('p', {
        className: 'kicker',
        textContent: `Daily · ${prettyDate(today)} · Today: ${cubed ? 'Cubed' : 'Flat'}`,
      }),
      el('p', { textContent: text }),
    ]),
    el('span', {
      className: `button ${solved ? 'ghost' : 'primary'}`,
      textContent: solved ? 'Replay' : 'Play',
    }),
  ]);
}
