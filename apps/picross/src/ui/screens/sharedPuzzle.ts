/**
 * A shared Flat puzzle (#159): `#/p/flat/<code>`, from a share link the editor makes, or its
 * play-test (`#/p/flat/<code>/test`). The puzzle is in the link (`@picross/grid/puzzles/share`),
 * and nothing about it is saved: it isn't the pack's. Cubed's are `#/p/cubed/<code>`.
 */
import { decodeShare } from '../../puzzles/share';
import type { Puzzle } from '@picross/grid/puzzles/format';
import { allPuzzlesLink } from '@picross/play-grid/ui/components/endPanels';
import { renderGameScreen } from '@picross/play-grid/ui/screens/gameScreen';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '@picross/shared/ui/format';
import { freePlayHref } from '../../game/freePlay';
import { getSettings } from '../../game/settings';

/** Where the Flat editor is (`ui/screens/editorScreen.ts`). */
export const FLAT_EDITOR = '#/editor/flat';

function broken(app: HTMLElement): void {
  app.replaceChildren(
    el('main', { className: 'screen shared-broken' }, [
      el('header', { className: 'topbar' }, [
        homeLink(),
        el('h1', { textContent: 'Can’t open that puzzle' }),
      ]),
      el('p', { textContent: 'That link doesn’t hold a puzzle. It may have been cut short.' }),
      el('a', { className: 'button primary', href: '#/editor', textContent: 'Make your own →' }),
    ]),
  );
}

function play(app: HTMLElement, puzzle: Puzzle, test: boolean) {
  const toEditor = el('a', {
    className: 'button primary',
    href: FLAT_EDITOR,
    textContent: '← Back to the editor',
  });
  return renderGameScreen(app, puzzle, {
    title: test ? `Testing: ${puzzle.name}` : 'A shared puzzle',
    ...(test ? { back: { href: FLAT_EDITOR, label: '← Editor' } } : {}),
    list: freePlayHref('flat'),
    mode: getSettings().mode,
    // Not the pack's: nothing is saved.
    save: () => {},
    complete: (game) => ({
      note: `${puzzle.name} · ${formatTime(game.elapsed)}`,
      actions: test
        ? [toEditor]
        : [
            allPuzzlesLink(freePlayHref('flat')),
            el('a', {
              className: 'button primary',
              href: '#/editor',
              textContent: 'Make your own →',
            }),
          ],
    }),
  });
}

/** Draws the shared puzzle in `code`, or says the link is broken. */
export async function renderSharedPuzzle(app: HTMLElement, code: string, test: boolean) {
  let puzzle: Puzzle;
  try {
    puzzle = await decodeShare(code);
  } catch {
    return broken(app);
  }
  return play(app, puzzle, test);
}
