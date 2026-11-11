import { SOLID } from '@picross/block/game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { getSettings } from '../../game/settings';
import { difficultyOf } from '@picross/block/puzzles/difficulty';
import type { Puzzle } from '@picross/block/puzzles/format';
import { nextPuzzle, PUZZLES } from '@picross/block/puzzles/index';
import { shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '@picross/shared/ui/format';
import { puzzleNumber } from '@picross/play-block/ui/format';
import { onHide } from '../../../ui/lifecycle';
import { createPlay } from '@picross/play-block/ui/screens/play';
import { cubedHref } from '../../href';
import { currentPoints } from '../../../game/rank';
import { earnedNote } from './earned';

/** Free play (#/cubed/play/<id>): saves as you go, records times, and offers the next puzzle. */
export function renderGameScreen(root: HTMLElement, puzzle: Puzzle): () => void {
  const saved = getSavedBoard(puzzle.id);
  const solvedBefore = Boolean(getPuzzleStats(puzzle.id));
  let changed = false;

  const play = createPlay(root, {
    home: cubedHref(),
    puzzle,
    title: solvedBefore ? puzzle.name : puzzleNumber(PUZZLES.indexOf(puzzle)),
    mode: getSettings().mode,
    saved,
    hooks: {
      changed: () => (changed = true),
      solved(time) {
        const pointsBefore = currentPoints();
        const best = recordSolve(puzzle.id, time, play.game.hintsUsed);
        const stats = getPuzzleStats(puzzle.id)!;
        const next = nextPuzzle(puzzle.id);
        const extras = [
          stats.solves > 1 && !best ? `best ${formatTime(stats.bestTime)}` : '',
          play.game.hintsUsed ? plural(play.game.hintsUsed, 'hint') : '',
        ].filter(Boolean);
        return [
          el('h2', { textContent: 'Solved!' }),
          shapePicture(puzzle, 120),
          el('p', { className: 'end-name', textContent: puzzle.name }),
          el('p', {
            className: 'end-note',
            textContent: best
              ? `${formatTime(time)}, a new best!`
              : `${formatTime(time)}${extras.length ? ` (${extras.join(', ')})` : ''}`,
          }),
          el('p', { className: 'end-note', textContent: difficultyOf(puzzle).label }),
          ...earnedNote(pointsBefore),
          el('div', { className: 'end-actions' }, [
            el('a', { className: 'button ghost', href: cubedHref(), textContent: 'All puzzles' }),
            ...(next
              ? [
                  el('a', {
                    className: 'button primary',
                    href: cubedHref(`/play/${next.id}`),
                    textContent: 'Next',
                  }),
                ]
              : []),
          ]),
        ];
      },
    },
  });

  const persist = (elapsed: number) => {
    const { game } = play;
    if (game.over) {
      if (game.failed) clearSavedBoard(puzzle.id);
      return;
    }
    if (changed || saved) {
      game.elapsed = elapsed;
      const touched = game.blocks.some((b) => b !== SOLID);
      if (touched || elapsed > 5000) saveBoard(puzzle.id, game.save());
    }
  };
  onHide(() => persist(play.clock.elapsed));
  return () => persist(play.cleanup());
}
