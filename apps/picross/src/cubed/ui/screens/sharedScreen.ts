import { recordPlaytest } from '../../game/progress';
import { earnedNote } from './earned';
import { getSettings } from '../../game/settings';
import { decodeShare } from '@picross/block/puzzles/share';
import { shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '@picross/play-block/ui/format';
import { createPlay } from '@picross/play-block/ui/screens/play';
import { cubedHref } from '../../href';

/**
 * A shared puzzle (#/cubed/p/<code>), or a play-test from the editor (#/cubed/p/<code>/test). Nothing
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
        href: cubedHref('/editor'),
        textContent: '← Editor',
      });
      const play = createPlay(root, {
        home: cubedHref(),
        puzzle,
        title: test ? `Testing: ${puzzle.name}` : 'A shared puzzle',
        mode: getSettings().mode,
        back: test ? toEditor : homeLink(cubedHref()),
        hooks: {
          solved: (time) => {
            if (test) recordPlaytest();
            return [
              el('h2', { textContent: 'Solved!' }),
              shapePicture(puzzle, 120),
              el('p', { className: 'end-name', textContent: puzzle.name }),
              el('p', { className: 'end-note', textContent: formatTime(time) }),
              ...(test ? earnedNote() : []),
              el('div', { className: 'end-actions' }, [
                test
                  ? el('a', {
                      className: 'button primary',
                      href: cubedHref('/editor'),
                      textContent: 'Back to the editor',
                    })
                  : el('a', {
                      className: 'button primary',
                      href: cubedHref('/editor'),
                      textContent: 'Make your own',
                    }),
                el('a', {
                  className: 'button ghost',
                  href: cubedHref(),
                  textContent: 'All puzzles',
                }),
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
            homeLink(cubedHref()),
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
