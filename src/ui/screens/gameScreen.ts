import { SOLID } from '../../game/game';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { getSettings } from '../../game/settings';
import { difficultyOf } from '../../puzzles/difficulty';
import type { Puzzle } from '../../puzzles/format';
import { nextPuzzle, PUZZLES } from '../../puzzles/index';
import { shapePicture } from '../board/thumbnail';
import { el } from '../dom';
import { formatTime, plural, puzzleNumber } from '../format';
import { createPlay } from './play';

/** Free play (#/play/<id>): saves as you go, records times, and offers the next puzzle. */
export function renderGameScreen(root: HTMLElement, puzzle: Puzzle): () => void {
  const saved = getSavedBoard(puzzle.id);
  const solvedBefore = Boolean(getPuzzleStats(puzzle.id));
  let changed = false;

  const play = createPlay(root, {
    puzzle,
    title: solvedBefore ? puzzle.name : puzzleNumber(PUZZLES.indexOf(puzzle)),
    mode: getSettings().mode,
    saved,
    hooks: {
      changed: () => (changed = true),
      solved(time) {
        const best = recordSolve(puzzle.id, time);
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
          el('div', { className: 'end-actions' }, [
            el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
            ...(next
              ? [
                  el('a', {
                    className: 'button primary',
                    href: `#/play/${next.id}`,
                    textContent: 'Next',
                  }),
                ]
              : []),
          ]),
        ];
      },
    },
  });

  return () => {
    const elapsed = play.cleanup();
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
}
