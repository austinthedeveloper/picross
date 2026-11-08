import { SOLID } from '../../game/game';
import { getDailyBoard, recordDaily, saveDailyBoard } from '../../game/daily';
import { getSettings } from '../../game/settings';
import { dailyPuzzle, dateKey } from '../../puzzles/daily';
import { shapePicture } from '../board/thumbnail';
import { el } from '../dom';
import { formatTime, plural } from '../format';
import { createPlay } from './play';
import { prettyDate } from './dailyCard';

/** Today's puzzle (#/daily): one per day, with a streak. */
export function renderDailyScreen(root: HTMLElement): () => void {
  const today = dateKey();
  const { puzzle } = dailyPuzzle(today);
  const saved = getDailyBoard(today);
  let changed = false;
  const play = createPlay(root, {
    puzzle,
    title: `Daily · ${prettyDate(today)}`,
    mode: getSettings().mode,
    saved,
    hooks: {
      changed: () => (changed = true),
      solved(time) {
        const streak = recordDaily(today, time);
        return [
          el('h2', { textContent: 'Solved!' }),
          shapePicture(puzzle, 120),
          el('p', { className: 'end-name', textContent: puzzle.name }),
          el('p', {
            className: 'end-note',
            textContent: `${formatTime(time)} · ${plural(streak, 'day')} in a row`,
          }),
          el('div', { className: 'end-actions' }, [
            el('a', { className: 'button primary', href: '#/', textContent: 'All puzzles' }),
          ]),
        ];
      },
    },
  });
  return () => {
    const elapsed = play.cleanup();
    const { game } = play;
    if (game.over || !(changed || saved)) return;
    game.elapsed = elapsed;
    if (game.blocks.some((b) => b !== SOLID)) saveDailyBoard(today, game.save());
  };
}
