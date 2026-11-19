import type { Puzzle } from '@picross/block/puzzles/format';
import { createPlay } from '@picross/play-block/ui/screens/play';
import { el } from '@picross/shared/ui/dom';
import { reducedMotion, wait } from '@picross/shared/ui/motion';
import { getSettings } from '../../game/settings';
import { cubedHref } from '../../href';

/**
 * The trio's second stage (a prototype): carve the block the 2D picture showed. Solved, it
 * turns once in its colors, then comes apart into bricks for the build
 * (`#/cubed/build/<id>`). Nothing is saved, like the first stage.
 */
export function renderTrioCarve(root: HTMLElement, puzzle: Puzzle): () => void {
  const here = location.hash;
  const play = createPlay(root, {
    puzzle,
    title: `Carve the ${puzzle.name.toLowerCase()} · 2 of 3`,
    mode: getSettings().mode,
    home: '#/',
    hooks: {
      solved() {
        // Let the sculpture turn for a moment, then it pops into bricks.
        void wait(reducedMotion() ? 400 : 2200).then(() => {
          if (location.hash === here) location.replace(cubedHref(`/build/${puzzle.id}`));
        });
        return [
          el('h2', { textContent: 'Carved!' }),
          el('p', { className: 'end-note', textContent: 'Now watch it come apart…' }),
        ];
      },
    },
  });
  return () => void play.cleanup();
}
