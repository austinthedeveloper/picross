import { PAINTED } from '../../../game/game';
import { getGadget } from '@picross/shared/puzzles/gadgets';
import type { Encounter } from '../../../story/data';
import { gadgetArt, iconArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import type { Kind } from './encounter';
import { took } from './encounter';

/**
 * A dig: no enemy and no HP pressure. The block is earth; finishing it reveals the find,
 * which becomes the puzzle's gadget.
 */
export function digKind(encounter: Encounter): Kind {
  const gadget = encounter.gadget ? getGadget(encounter.gadget) : undefined;
  const find = el('span', { className: 'dig-find', textContent: '?', ariaHidden: 'true' });
  const status = el('span', {
    className: 'dig-status',
    textContent: 'Something is buried here. Take your time: mistakes don’t hurt.',
  });
  return {
    mode: 'relaxed',
    header: el('section', { className: 'dig', ariaLabel: 'Dig site' }, [
      el('span', { className: 'dig-icon', ariaHidden: 'true' }, [iconArt('dig')]),
      status,
      find,
    ]),
    attach(play) {
      play.screen.classList.add('dig-site');
      // The block is earth until it's dug out; paint still shows, so you can mark finds.
      play.view.styler = (cell) => (play.game.blocks[cell] === PAINTED ? null : 'dirt');
      play.view.rebuild();
    },
    land() {
      find.replaceChildren(gadget ? gadgetArt(gadget.id) : '✨');
      find.classList.add('found');
      const name = encounter.puzzle.name.toLowerCase();
      status.textContent = gadget
        ? `You dug up a ${name}. It’s a ${gadget.name.toLowerCase()} now.`
        : `You dug up a ${name}.`;
    },
    note: (game) => `${encounter.name} cleared in ${took(game)}`,
  };
}
