import { SOLID } from '@picross/block/game/game';
import { clearDailyBoard, getDailyBoard, recordDaily, saveDailyBoard } from '../../game/daily';
import { currentPoints } from '../../../game/rank';
import { earnedNote } from './earned';
import { getSettings } from '../../game/settings';
import { dailyPuzzle, dateKey } from '@picross/block/puzzles/daily';
import { shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '@picross/shared/ui/format';
import { onHide } from '../../../ui/lifecycle';
import { createPlay } from '@picross/play-block/ui/screens/play';
import { cubedHref, HOME } from '../../href';

/** A day's key ("2026-11-11") as the title shows it ("Nov 11"). */
const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

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
    home: HOME,
    puzzle,
    title: `Daily · ${prettyDate(today)}`,
    mode: getSettings().mode,
    saved,
    hooks: {
      changed: () => (changed = true),
      solved(time) {
        const pointsBefore = currentPoints();
        const streak = recordDaily(today, time);
        return [
          el('h2', { textContent: 'Solved!' }),
          shapePicture(puzzle, 120),
          el('p', { className: 'end-name', textContent: puzzle.name }),
          el('p', {
            className: 'end-note',
            textContent: `${formatTime(time)} · ${plural(streak, 'day')} in a row`,
          }),
          ...earnedNote(pointsBefore),
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
