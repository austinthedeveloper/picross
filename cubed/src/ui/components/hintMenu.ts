import { el } from '../dom';

export interface HintMenu {
  root: HTMLDetailsElement;
  /** Updates the count and whether hints are available. */
  render(left: number, enabled: boolean): void;
  close(): void;
  dispose(): void;
}

/**
 * "💡 Hint n" with a small menu, like the 2D game's: work out a line, or check for
 * mistakes. Each costs a hint.
 */
export function createHintMenu(actions: { line(): void; check(): void }): HintMenu {
  const summary = el('summary', { className: 'button' });
  const note = el('p', { className: 'hint-note' });
  const root = el('details', { className: 'hint-menu' }, [
    summary,
    el('div', { className: 'hint-pop' }, [
      note,
      el('button', {
        textContent: 'Work out a line',
        onclick: () => {
          root.open = false;
          actions.line();
        },
      }),
      el('button', {
        textContent: 'Check for mistakes',
        onclick: () => {
          root.open = false;
          actions.check();
        },
      }),
    ]),
  ]);
  const outside = (e: Event) => {
    if (root.open && !root.contains(e.target as Node)) root.open = false;
  };
  document.addEventListener('pointerdown', outside);
  return {
    root,
    render(left, enabled) {
      summary.textContent = `💡 Hint ${left}`;
      root.classList.toggle('empty', !enabled);
      note.textContent = enabled
        ? `Each costs a hint. ${left} left.`
        : left > 0
          ? 'Not now.'
          : 'No hints left on this puzzle.';
      if (!enabled) root.open = false;
    },
    close: () => (root.open = false),
    dispose: () => document.removeEventListener('pointerdown', outside),
  };
}
