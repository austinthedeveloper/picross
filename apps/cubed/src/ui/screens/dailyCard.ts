import { currentStreak, solvedOn } from '../../game/daily';
import { dateKey } from '../../puzzles/daily';
import { el } from '../dom';
import { formatTime, plural } from '../format';

export const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** The daily puzzle's card on the list. */
export function dailyCard(): HTMLElement {
  const today = dateKey();
  const solved = solvedOn(today);
  const streak = currentStreak(today);
  return el('a', { className: 'feature-card daily-card', href: '#/daily' }, [
    el('div', {}, [
      el('p', { className: 'kicker', textContent: `Daily · ${prettyDate(today)}` }),
      el('p', {
        textContent: solved
          ? `Solved in ${formatTime(solved)}. ${streak > 1 ? `${streak}-day streak!` : 'Come back tomorrow.'}`
          : `A new block every day.${streak ? ` Keep your ${plural(streak, 'day')} streak going.` : ''}`,
      }),
    ]),
    el('span', {
      className: `button ${solved ? 'ghost' : 'primary'}`,
      textContent: solved ? 'Replay' : 'Play',
    }),
  ]);
}
