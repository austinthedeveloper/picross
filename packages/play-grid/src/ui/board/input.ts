import { Cell, type Board } from '@picross/grid/engine/board';
import type { Change } from '@picross/grid/engine/history';

export type Tool = typeof Cell.Filled | typeof Cell.Marked;

export interface InputOptions {
  board: Board;
  getTool(): Tool;
  enabled(): boolean;
  /** Applies changes; returns those applied and whether to end the stroke. */
  onPreview(changes: Change[]): { applied: Change[]; stop: boolean };
  onCommit(changes: Change[]): void;
  /** Undoes a stroke's previewed changes, e.g. when a second finger starts a pinch. */
  onCancel(changes: Change[]): void;
  onHover(r: number | null, c: number | null): void;
}

/**
 * Pointer input for the board: click/tap to fill, right-click (or the mark
 * tool) to mark, and drag to paint a straight line. A stroke only changes
 * cells in the same state as the cell it started on, so dragging from an
 * empty cell paints empties and dragging from a filled cell erases fills.
 */
export function attachInput(root: HTMLElement, opts: InputOptions): void {
  const { board } = opts;
  const w = board.width;

  let stroke: {
    pointerId: number;
    start: { r: number; c: number };
    axis: 'row' | 'col' | null;
    match: Cell;
    target: Cell;
    changes: Map<number, Change>;
  } | null = null;

  const cellAt = (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y);
    const cell = hit instanceof HTMLElement ? hit.closest<HTMLElement>('.cell') : null;
    if (!cell || !root.contains(cell)) return null;
    const i = Number(cell.dataset.i);
    return { r: Math.floor(i / w), c: i % w };
  };

  /** Extends the stroke along its axis (locked by the first move) to (r, c). */
  const paintTo = (r: number, c: number) => {
    const s = stroke;
    if (!s) return;
    const { start } = s;
    if (!s.axis) {
      if (r === start.r && c === start.c) return;
      s.axis = Math.abs(c - start.c) >= Math.abs(r - start.r) ? 'row' : 'col';
    }
    // Fill every cell between start and here, so fast drags don't skip any.
    const fresh: Change[] = [];
    const visit = (rr: number, cc: number) => {
      const index = rr * w + cc;
      if (s.changes.has(index) || board.cells[index] !== s.match) return;
      fresh.push({ index, from: board.cells[index], to: s.target });
    };
    if (s.axis === 'row') {
      const step = Math.sign(c - start.c) || 1;
      for (let cc = start.c; cc !== c + step; cc += step) visit(start.r, cc);
    } else {
      const step = Math.sign(r - start.r) || 1;
      for (let rr = start.r; rr !== r + step; rr += step) visit(rr, start.c);
    }
    if (fresh.length) apply(fresh);
  };

  const apply = (changes: Change[]) => {
    if (!stroke) return;
    const { applied, stop } = opts.onPreview(changes);
    for (const change of applied) stroke.changes.set(change.index, change);
    if (stop) finish();
  };

  const finish = () => {
    if (!stroke) return;
    const changes = [...stroke.changes.values()];
    stroke = null;
    opts.onCommit(changes);
  };

  root.addEventListener('contextmenu', (e) => e.preventDefault());

  root.addEventListener('pointerdown', (e) => {
    if (stroke && e.pointerType === 'touch' && e.pointerId !== stroke.pointerId) {
      // A second finger means pinch/pan, not painting.
      const changes = [...stroke.changes.values()];
      stroke = null;
      opts.onCancel(changes);
      return;
    }
    if (stroke || !opts.enabled() || (e.button !== 0 && e.button !== 2)) return;
    const pos = cellAt(e.clientX, e.clientY);
    if (!pos) return;
    e.preventDefault();
    root.setPointerCapture(e.pointerId);
    const tool = e.button === 2 ? Cell.Marked : opts.getTool();
    const match = board.cells[pos.r * w + pos.c];
    stroke = {
      pointerId: e.pointerId,
      start: pos,
      axis: null,
      match,
      target: match === Cell.Empty ? tool : Cell.Empty,
      changes: new Map(),
    };
    apply([{ index: pos.r * w + pos.c, from: match, to: stroke.target }]);
  });

  root.addEventListener('pointermove', (e) => {
    const pos = cellAt(e.clientX, e.clientY);
    if (!stroke) {
      if (e.pointerType === 'mouse') opts.onHover(pos?.r ?? null, pos?.c ?? null);
      return;
    }
    if (e.pointerId !== stroke.pointerId || !pos) return;
    opts.onHover(pos.r, pos.c);
    paintTo(pos.r, pos.c);
  });

  const end = (e: PointerEvent) => {
    if (stroke && e.pointerId === stroke.pointerId) finish();
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('pointerleave', (e) => {
    if (!stroke && e.pointerType === 'mouse') opts.onHover(null, null);
  });
}
