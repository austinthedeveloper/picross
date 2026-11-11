import type { Puzzle } from '@picross/grid/puzzles/format';
import { getGadget } from '@picross/story/puzzles/gadgets';
import { gadgetArt, iconArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { pause } from '@picross/shared/ui/motion';
import type { PlaySession } from '@picross/play-grid/ui/screens/gameScreen';

/**
 * A dig encounter (#29): no enemy and no HP pressure. The board is dirt, and
 * finishing the picture brushes the dirt away to reveal the buried part, which
 * becomes the puzzle's gadget (#28).
 */
export function digHooks(puzzle: Puzzle): Pick<PlaySession, 'header' | 'theme' | 'celebrate'> {
  const gadget = puzzle.gadget ? getGadget(puzzle.gadget) : undefined;
  const find = el('span', { className: 'dig-find', textContent: '?' });
  find.setAttribute('aria-hidden', 'true');
  const status = el('span', {
    className: 'dig-status',
    textContent: 'Something is buried here. Take your time: mistakes don’t hurt.',
  });
  const header = el('section', { className: 'dig', ariaLabel: 'Dig site' }, [
    el('span', { className: 'dig-icon', ariaHidden: 'true' }, [iconArt('dig')]),
    status,
    find,
  ]);

  return {
    header,
    theme: 'dig',
    // The dirt falls away, the part gleams, then the find pops into the header.
    async celebrate(board) {
      board.classList.add('excavated');
      await pause(700);
      find.replaceChildren(gadget ? gadgetArt(gadget.id) : '✨');
      find.classList.add('found');
      status.textContent = gadget
        ? `You dug up a ${puzzle.name.toLowerCase()}. It's a ${gadget.name.toLowerCase()} now.`
        : `You dug up a ${puzzle.name.toLowerCase()}.`;
      await pause(700);
    },
  };
}
