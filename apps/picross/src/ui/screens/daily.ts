import {
  dailyStreak,
  getDailyBoard,
  isDailySolved,
  recordDailySolve,
  saveDailyBoard,
  solvedOn,
} from '../../game/daily';
import { badgeNote, earnFromStats } from '../../game/badges';
import { currentPoints, rankUpNote } from '../../game/rank';
import { getSettings } from '../../game/settings';
import { dailyDimension, dailyFor, dateKey, type Daily } from '../../puzzles/daily';
import { createPicture } from '@picross/play-grid/ui/board/picture';
import { allPuzzlesLink } from '@picross/play-grid/ui/components/endPanels';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '@picross/shared/ui/format';
import { renderGameScreen, type PlaySession } from '@picross/play-grid/ui/screens/gameScreen';

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

/**
 * Today's puzzle at #/daily (#69) on a Flat day: its own board and a streak, apart from free
 * play. On a Cubed day (#156) the route opens Cubed's daily screen instead (routes.ts).
 */
export function renderDailyScreen(app: HTMLElement): () => void {
  const daily = dailyFor(today());
  const session: PlaySession = {
    title: `Daily · ${dayLabel(daily.key)}`,
    mode: getSettings().mode,
    saved: getDailyBoard(daily.key, 'grid'),
    save: (board) => saveDailyBoard(daily.key, 'grid', board),
    complete(game) {
      const already = isDailySolved(daily.key);
      const pointsBefore = currentPoints();
      const streak = recordDailySolve(daily.key, 'grid', game.elapsed);
      let note = `Solved in ${formatTime(game.elapsed)}`;
      if (game.hintsUsed) note += ` · ${plural(game.hintsUsed, 'hint')}`;
      note += ` · 🔥 ${plural(streak, 'day')} in a row`;
      if (!already && streak > 1) note += '!';
      note += ` ${reveal(daily)} Come back tomorrow for the next one.`;
      const rankUp = rankUpNote(pointsBefore);
      if (rankUp) note += ` ${rankUp}`;
      const badges = badgeNote(earnFromStats());
      if (badges) note += ` ${badges}`;
      return { note, actions: [allPuzzlesLink()] };
    },
  };
  return renderGameScreen(app, daily.puzzle, session);
}

/** What the player calls each board. */
const BOARD_NAMES = { grid: 'Flat', block: 'Cubed' } as const;

/**
 * The daily card at the top of the puzzle list: today's date, which board it's on (#156),
 * its size, the streak, and status. A Cubed day's block isn't drawn here, so the list
 * doesn't load Cubed's pack.
 */
export function dailyCard(): HTMLElement {
  const key = today();
  const dimension = dailyDimension(key);
  const flat = dimension === 'grid' ? dailyFor(key) : null;
  const solved = solvedOn(key);
  const { streak, best } = dailyStreak(key);
  const solvedNote = flat
    ? ` · ${reveal(flat)}`
    : solved?.time !== undefined
      ? ` in ${formatTime(solved.time)}`
      : '';
  const status = solved
    ? `✓ Solved${solvedNote}`
    : getDailyBoard(key, dimension)
      ? 'In progress'
      : 'Not solved yet';
  const thumb =
    solved && flat
      ? createPicture(flat.puzzle.solution, Math.floor(60 / flat.puzzle.width))
      : el('span', { className: 'thumb-unknown', textContent: flat ? '?' : '🧊' });
  const meta = [
    `Today: ${BOARD_NAMES[dimension]}`,
    ...(flat ? [`${flat.puzzle.width}×${flat.puzzle.height}`] : []),
    status,
  ];
  return el('a', { className: `daily-card${solved ? ' solved' : ''}`, href: '#/daily' }, [
    el('div', { className: 'thumb' }, [thumb]),
    el('div', { className: 'daily-text' }, [
      el('span', { className: 'daily-kicker', textContent: `Daily · ${dayLabel(key)}` }),
      el('span', { className: 'daily-meta', textContent: meta.join(' · ') }),
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
