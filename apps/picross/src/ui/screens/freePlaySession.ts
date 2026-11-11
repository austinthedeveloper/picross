import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { nextUnsolved } from '../../game/pickPuzzle';
import { currentPoints, rankUpNote } from '../../game/rank';
import { getSettings } from '../../game/settings';
import type { Puzzle } from '../../puzzles/format';
import { puzzles } from '../../puzzles/index';
import { allPuzzlesLink } from '../components/endPanels';
import { el } from '../dom';
import { formatTime, plural } from '../format';
import type { PlaySession } from './gameScreen';

/** Playing a puzzle from the puzzle list: saves boards and records best times. */
export function freePlaySession(puzzle: Puzzle): PlaySession {
  return {
    title: `${puzzle.width}×${puzzle.height}`,
    mode: getSettings().mode,
    saved: getSavedBoard(puzzle.id),
    save: (board) => (board ? saveBoard(puzzle.id, board) : clearSavedBoard(puzzle.id)),
    complete(game) {
      const prevBest = getPuzzleStats(puzzle.id)?.bestTime;
      const pointsBefore = currentPoints();
      const newBest = recordSolve(puzzle.id, game.elapsed);
      const time = formatTime(game.elapsed);
      let note =
        prevBest === undefined
          ? `Time ${time}`
          : newBest
            ? `New best: ${time} (was ${formatTime(prevBest)})`
            : `Time ${time} · Best ${formatTime(prevBest)}`;
      if (game.hintsUsed) note += ` · ${plural(game.hintsUsed, 'hint')}`;
      const rankUp = rankUpNote(pointsBefore);
      if (rankUp) note += ` · ${rankUp}`;

      const next = nextUnsolved(puzzles, puzzle.id, (id) => Boolean(getPuzzleStats(id)));
      const actions = [allPuzzlesLink()];
      if (next) {
        actions.push(
          el('a', {
            className: 'button primary',
            href: `#/play/${next.id}`,
            textContent: 'Next →',
          }),
        );
      }
      return { note, actions };
    },
  };
}
