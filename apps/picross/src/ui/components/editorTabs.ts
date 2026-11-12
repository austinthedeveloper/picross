import { gameHref, type GameKind } from '@picross/shared/game/boards';
import { el } from '@picross/shared/ui/dom';
import { boardTabs } from './boardTabs';

/**
 * Under each editor's top bar (#152, #159): the way back to the one editor's start
 * (`#/editor`: new puzzles and drafts), and Flat | Cubed tabs between the two editors,
 * `#/editor/flat` and Cubed's `#/cubed/editor`.
 */
export const editorTabs = (current: GameKind) =>
  el('div', { className: 'editor-switch' }, [
    el('a', { className: 'button ghost', href: '#/editor', textContent: '← New or drafts' }),
    boardTabs(current, (tab) => (tab === 'flat' ? '#/editor/flat' : `${gameHref('cubed')}/editor`)),
  ]);
