import { PUZZLES } from '@picross/block/puzzles/index';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { cubedHref } from '../../href';

const RULES: [string, string][] = [
  [
    'The block',
    'Every puzzle is a block of cubes with a shape hidden inside. Break away every cube that isn’t part of the shape and it’s solved.',
  ],
  [
    'Clues',
    'A number on a face counts the cubes of the shape in the line that runs straight into that face, all the way through the block.',
  ],
  [
    'Circles and squares',
    'A plain number means those cubes are all together. A circle means they’re in two pieces, and a square means three or more.',
  ],
  ['Blank faces', 'Some lines have no clue. You’ll work them out from the lines that cross them.'],
  [
    'Zeros first',
    'A 0 means nothing in that line is part of the shape: break all of it. A clue as long as its line keeps every cube.',
  ],
  [
    'Paint',
    'Paint a cube you know is part of the shape. Painted cubes can’t be broken by accident. Paint it again to clear it.',
  ],
  [
    'Whole lines',
    'Hold on a cube to break or paint its whole line, straight through the block, the way its face looks. A 0 clears in one go. (Keys: Shift+X or Shift+Space.)',
  ],
  [
    'Turn and peel',
    'Drag empty space, or pick Turn, to look around. Peel layers off the side facing you to see inside.',
  ],
  [
    'Hearts',
    'In Hearts mode, breaking a cube of the shape costs a heart. Relaxed mode never checks; undo fixes a slip.',
  ],
];

/** The rules, with a small first puzzle to try (#/cubed/how-to-play). */
export function renderHowToPlay(root: HTMLElement): void {
  const first = PUZZLES[0];
  root.replaceChildren(
    el('div', { className: 'screen how-to' }, [
      el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: 'How to play' })]),
      el(
        'dl',
        { className: 'rules' },
        RULES.flatMap(([term, text]) => [
          el('dt', { textContent: term }),
          el('dd', { textContent: text }),
        ]),
      ),
      el('div', { className: 'end-actions' }, [
        el('a', {
          className: 'button ghost',
          href: cubedHref('/tutorial'),
          textContent: 'Guided tutorial',
        }),
        el('a', {
          className: 'button primary',
          href: cubedHref(`/play/${first.id}`),
          textContent: 'Try the first puzzle',
        }),
      ]),
    ]),
  );
}
