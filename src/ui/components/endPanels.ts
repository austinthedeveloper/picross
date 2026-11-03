import type { Puzzle } from '../../puzzles/format';
import { createPicture } from '../board/picture';
import { el } from '../dom';

export const allPuzzlesLink = () =>
  el('a', { className: 'button ghost', href: '#/', textContent: 'All puzzles' });

/** Contents of the panel shown when a puzzle is solved. */
export function solvedPanelContent(puzzle: Puzzle, note: string, actions: HTMLElement[]): Node[] {
  return [
    el('h2', { textContent: 'Solved!' }),
    createPicture(puzzle.solution, Math.max(4, Math.floor(120 / puzzle.width))),
    el('p', { className: 'end-name', textContent: puzzle.name }),
    el('p', { className: 'end-note', textContent: note }),
    el('div', { className: 'end-actions' }, actions),
  ];
}

/** Contents of a generic end panel: a heading, a note, and buttons. */
export function createEndPanel(title: string, note: string, actions: HTMLElement[]): Node[] {
  return [
    el('h2', { textContent: title }),
    el('p', { className: 'end-note', textContent: note }),
    el('div', { className: 'end-actions' }, actions),
  ];
}

/** The panel shown when hearts mode runs out. */
export function createFailedPanel(onRetry: () => void): HTMLElement {
  return el('div', { className: 'end-panel failed', hidden: true }, [
    el('h2', { textContent: 'Out of hearts' }),
    el('p', { className: 'end-note', textContent: 'Three wrong fills. Try again?' }),
    el('div', { className: 'end-actions' }, [
      allPuzzlesLink(),
      el('button', { className: 'button primary', textContent: 'Retry', onclick: onRetry }),
    ]),
  ]);
}
