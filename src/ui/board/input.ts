import type { BlockView, Pick } from './blockView';

export interface InputOptions {
  /** Whether a press on a cube acts (false: every drag turns the block, as with the Turn tool). */
  acting(): boolean;
  begin(pick: Pick): void;
  extend(pick: Pick): void;
  end(): void;
  /** The pointer is over a cube (or not), for the cursor outline on a mouse. */
  hover(pick: Pick | null): void;
  /** The player turned the block. */
  orbited?(): void;
  /** A double tap on empty space: reset the view. */
  reset?(): void;
  /** A stroke held still on its first cube: carry it through the whole line. */
  hold?(): void;
}

/** How long a press stays still to count as a hold. */
const HOLD_MS = 450;

const DOUBLE_TAP_MS = 320;
/** How far a press can move and still count as a tap. */
const TAP_SLOP = 8;

const TURN_SPEED = 0.008;

/**
 * Pointer input on the block. A press on a cube starts a stroke; a press on empty space,
 * a right-button or middle-button drag, or any drag with the Turn tool turns the block.
 * Two fingers turn and pinch to zoom; the wheel zooms.
 */
export function attachInput(view: BlockView, opts: InputOptions): () => void {
  const canvas = view.canvas;
  const pointers = new Map<number, { x: number; y: number }>();
  let mode: 'stroke' | 'turn' | null = null;
  let pinch: { dist: number; zoom: number; x: number; y: number } | null = null;
  let lastCell = -1;
  let pressAt = { x: 0, y: 0 };
  let moved = 0;
  let lastTap = 0;
  let holdTimer = 0;
  const cancelHold = () => window.clearTimeout(holdTimer);

  const twoFinger = () => {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const down = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      cancelHold();
      // A second finger: whatever the first started becomes a turn and pinch.
      if (mode === 'stroke') opts.end();
      mode = null;
      const f = twoFinger();
      pinch = { dist: f.dist, zoom: view.zoom, x: f.x, y: f.y };
      return;
    }
    if (pointers.size > 2) return;
    pressAt = { x: e.clientX, y: e.clientY };
    moved = 0;
    const pick = e.button === 0 && opts.acting() ? view.pick(e.clientX, e.clientY) : null;
    if (pick) {
      mode = 'stroke';
      lastCell = pick.cell;
      opts.begin(pick);
      // Still after a moment, on the same cube: the whole line.
      holdTimer = window.setTimeout(() => {
        if (mode === 'stroke' && moved <= TAP_SLOP && lastCell === pick.cell) opts.hold?.();
      }, HOLD_MS);
    } else {
      mode = 'turn';
    }
  };

  const move = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') opts.hover(view.pick(e.clientX, e.clientY));
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const f = twoFinger();
      view.setZoom(pinch.zoom * (f.dist / pinch.dist));
      view.orbit(-(f.x - pinch.x) * TURN_SPEED, (f.y - pinch.y) * TURN_SPEED);
      pinch.x = f.x;
      pinch.y = f.y;
    } else if (mode === 'turn') {
      view.orbit(-dx * TURN_SPEED, dy * TURN_SPEED);
      moved = Math.max(moved, Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y));
      if (moved > TAP_SLOP) opts.orbited?.();
    } else if (mode === 'stroke') {
      moved = Math.max(moved, Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y));
      if (moved > TAP_SLOP) cancelHold();
      const pick = view.pick(e.clientX, e.clientY);
      if (pick && pick.cell !== lastCell) {
        lastCell = pick.cell;
        opts.extend(pick);
      }
    }
  };

  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    cancelHold();
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      if (mode === 'stroke') opts.end();
      if (mode === 'turn' && moved <= TAP_SLOP) {
        // A tap on empty space; two in a row reset the view.
        if (e.timeStamp - lastTap < DOUBLE_TAP_MS) {
          opts.reset?.();
          lastTap = 0;
        } else lastTap = e.timeStamp;
      }
      mode = null;
    }
  };

  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    view.setZoom(view.zoom * Math.exp(-e.deltaY * 0.0015));
  };
  const leave = () => opts.hover(null);
  const menu = (e: Event) => e.preventDefault();

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', menu);
  return () => {
    cancelHold();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('contextmenu', menu);
  };
}
