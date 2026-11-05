import {
  dailyStreak,
  getDailyBoard,
  isDailySolved,
  recordDailySolve,
  saveDailyBoard,
} from '../../game/daily';
import { getSettings } from '../../game/settings';
import { dailyFor, dateKey, previousDay, type Daily } from '../../puzzles/daily';
import { createPicture } from '../board/picture';
import { allPuzzlesLink } from '../components/endPanels';
import { el } from '../dom';
import { formatTime, plural } from '../format';
import { renderGameScreen, type PlaySession } from './gameScreen';

const today = () => dateKey(new Date());

/** "Tue, Nov 3" for a day key. */
function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const reveal = (daily: Daily) =>
  `It was the ${daily.base.name}${daily.transform === 'as drawn' ? '' : `, ${daily.transform}`}.`;

/** Today's puzzle at #/daily (#69): its own board and a streak, apart from free play. */
export function renderDailyScreen(app: HTMLElement): () => void {
  const daily = dailyFor(today());
  const yesterday = previousDay(daily.key);
  const session: PlaySession = {
    title: `Daily · ${dayLabel(daily.key)}`,
    mode: getSettings().mode,
    saved: getDailyBoard(daily.key),
    save: (board) => saveDailyBoard(daily.key, board),
    complete(game) {
      const already = isDailySolved(daily.key);
      const streak = recordDailySolve(daily.key, yesterday);
      let note = `Solved in ${formatTime(game.elapsed)}`;
      if (game.hintsUsed) note += ` · ${plural(game.hintsUsed, 'hint')}`;
      note += ` · 🔥 ${plural(streak, 'day')} in a row`;
      if (!already && streak > 1) note += '!';
      note += ` ${reveal(daily)} Come back tomorrow for the next one.`;
      return { note, actions: [allPuzzlesLink()] };
    },
  };
  return renderGameScreen(app, daily.puzzle, session);
}

/** The daily card at the top of the puzzle list: today's date, size, streak, and status. */
export function dailyCard(): HTMLElement {
  const daily = dailyFor(today());
  const solved = isDailySolved(daily.key);
  const { streak, best } = dailyStreak(daily.key, previousDay(daily.key));
  const status = solved
    ? `✓ Solved · ${reveal(daily)}`
    : getDailyBoard(daily.key)
      ? 'In progress'
      : 'Not solved yet';
  const thumb = solved
    ? createPicture(daily.puzzle.solution, Math.floor(60 / daily.puzzle.width))
    : el('span', { className: 'thumb-unknown', textContent: '?' });
  return el('a', { className: `daily-card${solved ? ' solved' : ''}`, href: '#/daily' }, [
    el('div', { className: 'thumb' }, [thumb]),
    el('div', { className: 'daily-text' }, [
      el('span', { className: 'daily-kicker', textContent: `Daily · ${dayLabel(daily.key)}` }),
      el('span', {
        className: 'daily-meta',
        textContent: `${daily.puzzle.width}×${daily.puzzle.height} · ${status}`,
      }),
      el('span', {
        className: 'daily-streak',
        textContent:
          streak > 0
            ? `🔥 ${plural(streak, 'day')} in a row · best ${best}`
            : best > 0
              ? `Streak ended · best ${best}`
              : 'Solve one a day to start a streak',
      }),
    ]),
    el('span', { className: 'daily-go', ariaHidden: 'true', textContent: solved ? '✓' : '→' }),
  ]);
}
