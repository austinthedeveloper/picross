import { MAX_HINTS, type HintTarget } from '@picross/grid/game/game';
import { el } from '@picross/shared/ui/dom';

export interface HintMenu {
  root: HTMLDetailsElement;
  /** Updates the remaining count and which cell a hint would use. */
  update(hintsLeft: number, cursor: { r: number; c: number }): void;
  close(): void;
}

/** A "Hint n/3" dropdown offering to reveal the cursor's cell, row, or column. */
export function createHintMenu(onHint: (target: HintTarget) => void): HintMenu {
  const summary = el('summary', { className: 'button' });
  const note = el('p', { className: 'hint-note' });
  const option = (target: HintTarget, label: string) =>
    el('button', { textContent: label, onclick: () => onHint(target) });
  const root = el('details', { className: 'hint-menu' }, [
    summary,
    el('div', { className: 'hint-pop' }, [
      note,
      option('cell', 'Reveal cell'),
      option('row', 'Reveal row'),
      option('col', 'Reveal column'),
    ]),
  ]);

  return {
    root,
    update(hintsLeft, { r, c }) {
      summary.textContent = `Hint ${hintsLeft}/${MAX_HINTS}`;
      root.classList.toggle('empty', hintsLeft === 0);
      note.textContent = hintsLeft
        ? `Uses the highlighted cell: row ${r + 1}, column ${c + 1}.`
        : 'No hints left for this puzzle.';
    },
    close() {
      root.open = false;
    },
  };
}
