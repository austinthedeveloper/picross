import { recordPlaytest } from '../../game/progress';
import { getSettings } from '../../game/settings';
import { decodeShare } from '../../puzzles/share';
import { shapePicture } from '../board/thumbnail';
import { homeLink } from '../components/homeLink';
import { el } from '../dom';
import { formatTime } from '../format';
import { createPlay } from './play';

/**
 * A shared puzzle (#/p/<code>), or a play-test from the editor (#/p/<code>/test). Nothing
 * is saved: it's someone's puzzle passing through.
 */
export function renderSharedScreen(root: HTMLElement, code: string, test: boolean): () => void {
  let cleanup = () => {};
  let gone = false;
  root.replaceChildren(el('div', { className: 'screen' }, [el('p', { textContent: 'Opening…' })]));
  decodeShare(code)
    .then((puzzle) => {
      if (gone) return;
      const toEditor = el('a', {
        className: 'button ghost',
        href: '#/editor',
        textContent: '← Editor',
      });
      const play = createPlay(root, {
        puzzle,
        title: test ? `Testing: ${puzzle.name}` : 'A shared puzzle',
        mode: getSettings().mode,
        back: test ? toEditor : homeLink(),
        hooks: {
          solved: (time) => {
            if (test) recordPlaytest();
            return [
              el('h2', { textContent: 'Solved!' }),
              shapePicture(puzzle, 120),
              el('p', { className: 'end-name', textContent: puzzle.name }),
              el('p', { className: 'end-note', textContent: formatTime(time) }),
              el('div', { className: 'end-actions' }, [
                test
                  ? el('a', {
                      className: 'button primary',
                      href: '#/editor',
                      textContent: 'Back to the editor',
                    })
                  : el('a', {
                      className: 'button primary',
                      href: '#/editor',
                      textContent: 'Make your own',
                    }),
                el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' }),
              ]),
            ];
          },
        },
      });
      cleanup = () => play.cleanup();
    })
    .catch(() => {
      if (gone) return;
      root.replaceChildren(
        el('div', { className: 'screen' }, [
          el('header', { className: 'topbar' }, [
            homeLink(),
            el('h1', { textContent: 'Can’t open that puzzle' }),
          ]),
          el('p', { textContent: 'The link looks broken or incomplete. Ask for it again?' }),
        ]),
      );
    });
  return () => {
    gone = true;
    cleanup();
  };
}
