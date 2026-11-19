import type { Puzzle } from '@picross/grid/puzzles/format';
import type { PlaySession } from '@picross/play-grid/ui/screens/gameScreen';
import { el } from '@picross/shared/ui/dom';
import { getSettings } from '../../game/settings';

/**
 * The trio's first stage (a prototype): draw the picture flat, then carve it as a block
 * (Cubed's `#/cubed/trio/<id>`), then build it of bricks. Nothing is saved: it's a try-out
 * of the build, not part of free play's progress.
 */
export function trioSession(puzzle: Puzzle): PlaySession {
  return {
    title: `Draw the ${puzzle.name.toLowerCase()} · 1 of 3`,
    mode: getSettings().mode,
    save: () => {},
    complete: () => ({
      note: 'Drawn! Next, carve it as a block.',
      // Cubed's route, written out: the flat side doesn't import Cubed's links (cubed/href.ts).
      actions: [
        el('a', {
          className: 'button primary',
          href: `#/cubed/trio/${puzzle.id}`,
          textContent: 'Carve it →',
        }),
      ],
    }),
  };
}
