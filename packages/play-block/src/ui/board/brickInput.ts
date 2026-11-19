/**
 * Pointer input both build screens share (Cubed's build stage, Brick kids): carrying a brick
 * from the tray to the plate. No three.js.
 */

/** Whether a point on the screen is over an element. */
export function isOver(el: Element, x: number, y: number): boolean {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

export interface CarryOptions {
  /** How far, in pixels, the press moves before it's a drag (and not a tap). */
  slop: number;
  /** Where a drop lands: the plate. */
  target: Element;
  /** The brick is dragged over (x, y), on the plate or off it. */
  hover(x: number, y: number): void;
  /** It's let go over the plate. */
  drop(x: number, y: number): void;
  /** It's let go anywhere else, cancelled, or it was only a tap. */
  away(): void;
  /** Ends the carry early: the screen's cleanup aborts it. */
  signal?: AbortSignal;
}

/**
 * Follows a press that started on a tray brick until it lets go. A drag carries the brick
 * and drops it where it's let go over the plate; a tap (or a cancelled touch) drops nothing,
 * so the brick stays in hand for a tap on the plate.
 */
export function carryFromTray(down: PointerEvent, opts: CarryOptions): void {
  const start = { x: down.clientX, y: down.clientY };
  let dragging = false;
  const done = new AbortController();
  const stop = () => done.abort();
  opts.signal?.addEventListener('abort', stop, { once: true, signal: done.signal });
  const listen = { signal: done.signal };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerId !== down.pointerId) return;
      if (!dragging && Math.hypot(e.clientX - start.x, e.clientY - start.y) > opts.slop) {
        dragging = true;
      }
      if (dragging) opts.hover(e.clientX, e.clientY);
    },
    listen,
  );
  const end = (e: PointerEvent) => {
    if (e.pointerId !== down.pointerId) return;
    stop();
    if (e.type === 'pointerup' && dragging && isOver(opts.target, e.clientX, e.clientY)) {
      opts.drop(e.clientX, e.clientY);
    } else opts.away();
  };
  window.addEventListener('pointerup', end, listen);
  window.addEventListener('pointercancel', end, listen);
}
