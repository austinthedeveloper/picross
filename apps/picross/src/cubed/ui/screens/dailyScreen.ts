import { SOLID } from '@picross/block/game/game';
import { clearDailyBoard, getDailyBoard, recordDaily, saveDailyBoard } from '../../game/daily';
import { getSettings } from '../../game/settings';
import { dailyPuzzle, dateKey } from '@picross/block/puzzles/daily';
import { shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '@picross/play-block/ui/format';
import { onHide } from '../../../ui/lifecycle';
import { createPlay } from '@picross/play-block/ui/screens/play';
import { prettyDate } from './dailyCard';
import { cubedHref } from '../../href';

/**
 * Today's puzzle on a Cubed day (#/daily, #156): one a day, Flat and Cubed by turns, with
 * one streak over both. `#/cubed/daily`, its old link, comes here too.
 */
export function renderDailyScreen(root: HTMLElement): () => void {
  const today = dateKey();
  const { puzzle } = dailyPuzzle(today);
  const saved = getDailyBoard(today);
  let changed = false;
  const play = createPlay(root, {
    home: cubedHref(),
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
            el('a', { className: 'button primary', href: cubedHref(), textContent: 'All puzzles' }),
          ]),
        ];
      },
    },
  });
  const persist = (elapsed: number) => {
    const { game } = play;
    if (game.failed) return clearDailyBoard(today);
    if (game.over || !(changed || saved)) return;
    game.elapsed = elapsed;
    if (game.blocks.some((b) => b !== SOLID)) saveDailyBoard(today, game.save());
  };
  onHide(() => persist(play.clock.elapsed));
  return () => persist(play.cleanup());
}
