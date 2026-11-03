import { Cell, type Board } from '../../engine/board';
import type { BoardView } from './boardView';

export interface Cursor {
  r: number;
  c: number;
}

export interface KeyboardOptions {
  board: Board;
  enabled(): boolean;
  /** Changes the cursor cell from `match` to `target`, as one undoable move. */
  act(index: number, match: Cell, target: Cell): void;
  onCursorMove(cursor: Cursor): void;
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/**
 * Keyboard play on a focusable board: arrows move a cursor, Space/Enter/F
 * toggles a fill, X/M toggles a mark, Delete/Backspace clears, and
 * Shift+arrow repeats the last action on the next cell (like a drag).
 * Clicking a cell also moves the cursor there. Returns the cursor.
 */
export function attachKeyboard(view: BoardView, opts: KeyboardOptions): { cursor: Cursor } {
  const { board } = opts;
  const w = board.width;
  const state = { cursor: { r: 0, c: 0 } };
  let lastAction: { match: Cell; target: Cell } | null = null;

  const moveTo = (r: number, c: number) => {
    state.cursor = {
      r: Math.max(0, Math.min(board.height - 1, r)),
      c: Math.max(0, Math.min(w - 1, c)),
    };
    view.setCursor(state.cursor.r, state.cursor.c);
    view.highlight(state.cursor.r, state.cursor.c);
    opts.onCursorMove(state.cursor);
  };
  const cursorIndex = () => state.cursor.r * w + state.cursor.c;

  const apply = (match: Cell, target: Cell) => {
    if (board.cells[cursorIndex()] === match && match !== target) {
      opts.act(cursorIndex(), match, target);
    }
  };
  const toggle = (kind: Cell) => {
    const from = board.cells[cursorIndex()];
    lastAction = { match: from, target: from === kind ? Cell.Empty : kind };
    apply(lastAction.match, lastAction.target);
  };
  const clear = () => {
    lastAction = { match: board.cells[cursorIndex()], target: Cell.Empty };
    apply(lastAction.match, lastAction.target);
  };

  view.root.addEventListener('pointerdown', (e) => {
    view.root.focus({ preventScroll: true });
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.cell');
    if (cell) {
      const i = Number(cell.dataset.i);
      moveTo(Math.floor(i / w), i % w);
    }
  });
  view.root.addEventListener('focus', () => moveTo(state.cursor.r, state.cursor.c));
  view.root.addEventListener('blur', () => view.highlight(null, null));

  view.root.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();
    const arrow = ARROWS[e.key];
    if (arrow) {
      moveTo(state.cursor.r + arrow[0], state.cursor.c + arrow[1]);
      if (e.shiftKey && lastAction && opts.enabled()) apply(lastAction.match, lastAction.target);
    } else if (!opts.enabled()) {
      return;
    } else if (key === ' ' || key === 'enter' || key === 'f') {
      toggle(Cell.Filled);
    } else if (key === 'x' || key === 'm') {
      toggle(Cell.Marked);
    } else if (key === 'delete' || key === 'backspace') {
      clear();
    } else {
      return;
    }
    e.preventDefault();
  });

  return state;
}
