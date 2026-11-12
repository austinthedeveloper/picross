import { freePlayHref } from '../../game/freePlay';
import {
  clearSavedBoard,
  getPuzzleStats,
  getSavedBoard,
  recordSolve,
  saveBoard,
} from '../../game/progress';
import { nextUnsolved } from '../../game/pickPuzzle';
import { badgeNote, earnFromStats } from '../../game/badges';
import { currentPoints, rankUpNote } from '../../game/rank';
import { getSettings } from '../../game/settings';
import type { Puzzle } from '@picross/grid/puzzles/format';
import { puzzles } from '@picross/grid/puzzles/index';
import { allPuzzlesLink } from '@picross/play-grid/ui/components/endPanels';
import { el } from '@picross/shared/ui/dom';
import { formatTime, plural } from '@picross/shared/ui/format';
import type { PlaySession } from '@picross/play-grid/ui/screens/gameScreen';

/** Playing a puzzle from the puzzle list: saves boards and records best times. */
export function freePlaySession(puzzle: Puzzle): PlaySession {
  return {
    title: `${puzzle.width}×${puzzle.height}`,
    // Home is the menu (#152); the list it came from is free play's Flat tab.
    back: { href: freePlayHref('flat'), label: '← Free play' },
    list: freePlayHref('flat'),
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
      const badges = badgeNote(earnFromStats());
      if (badges) note += ` · ${badges}`;

      const next = nextUnsolved(puzzles, puzzle.id, (id) => Boolean(getPuzzleStats(id)));
      const actions = [allPuzzlesLink(freePlayHref('flat'))];
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
