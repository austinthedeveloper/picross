export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export interface ZoomControl {
  readonly zoom: number;
  setZoom(zoom: number, anchor?: { x: number; y: number }): void;
  onChange(listener: (zoom: number) => void): void;
  /** While on, one finger (or the mouse) drags the board around instead of painting. */
  setPanning(on: boolean): void;
}

/** Room kept below a zoomed board for the sticky Fill/Mark and zoom bar. */
const CONTROLS_ROOM = 72;
/** A zoomed board is never squeezed shorter than this. */
const MIN_VIEW = 240;

/**
 * Zoom and pan for the board. `wrap` is the scroll container and `board`
 * sizes its cells from the `--zoom` custom property. Two-finger pinch zooms
 * around the fingers and two-finger drag pans; Ctrl+wheel (trackpad pinch)
 * zooms on desktop. The zoom buttons zoom around the middle of the part of the
 * board you can see, and a zoomed board is sized to fit the screen, so it scrolls
 * inside itself rather than running off the bottom of the page. With panning on
 * (the Move tool), one finger drags it.
 */
export function attachZoom(wrap: HTMLElement, board: HTMLElement): ZoomControl {
  let zoom = 1;
  const listeners: ((zoom: number) => void)[] = [];

  let panning = false;

  /** The middle of the part of the wrap that's on screen, in viewport coordinates. */
  const visibleMiddle = () => {
    const rect = wrap.getBoundingClientRect();
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, window.innerHeight);
    const left = Math.max(rect.left, 0);
    const right = Math.min(rect.right, window.innerWidth);
    return {
      x: right > left ? (left + right) / 2 : rect.left + rect.width / 2,
      y: bottom > top ? (top + bottom) / 2 : rect.top + rect.height / 2,
    };
  };

  /** A zoomed wrap ends above the sticky controls, so all of it can be on screen at once. */
  const fitHeight = () => {
    if (zoom <= 1) {
      wrap.style.maxHeight = '';
      return;
    }
    const top = Math.max(wrap.getBoundingClientRect().top, 0);
    wrap.style.maxHeight = `${Math.max(MIN_VIEW, window.innerHeight - top - CONTROLS_ROOM)}px`;
  };

  const setZoom = (next: number, anchor?: { x: number; y: number }) => {
    next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (next === zoom) return;
    const before = wrap.getBoundingClientRect();
    const from = anchor ?? visibleMiddle();
    // The board point under the anchor, which stays put (or, for the buttons, stays in the middle).
    const cx = (wrap.scrollLeft + from.x - before.left) / zoom;
    const cy = (wrap.scrollTop + from.y - before.top) / zoom;
    const wasZoomed = zoom > 1;
    zoom = next;
    board.style.setProperty('--zoom', String(zoom));
    wrap.classList.toggle('zoomed', zoom > 1);
    if (!wasZoomed || zoom <= 1) fitHeight();
    // Zooming in from a board that runs off the screen: bring the wrap into view first.
    if (!wasZoomed && zoom > 1 && !anchor) {
      const rect = wrap.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        wrap.scrollIntoView({ block: 'nearest' });
        fitHeight();
      }
    }
    const after = wrap.getBoundingClientRect();
    const to = anchor ?? visibleMiddle();
    wrap.scrollLeft = cx * zoom - (to.x - after.left);
    wrap.scrollTop = cy * zoom - (to.y - after.top);
    listeners.forEach((l) => l(zoom));
  };

  window.addEventListener('resize', () => fitHeight());

  // The Move tool: one pointer drags the board.
  let drag: { id: number; x: number; y: number } | null = null;
  wrap.addEventListener('pointerdown', (e) => {
    if (!panning || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add('grabbing');
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || touches.size > 1) return;
    wrap.scrollLeft -= e.clientX - drag.x;
    wrap.scrollTop -= e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  const drop = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      wrap.classList.remove('grabbing');
    }
  };
  wrap.addEventListener('pointerup', drop);
  wrap.addEventListener('pointercancel', drop);

  const touches = new Map<number, { x: number; y: number }>();
  let gesture: { dist: number; zoom: number; mid: { x: number; y: number } } | null = null;
  const measure = () => {
    const [a, b] = [...touches.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  wrap.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      wrap.setPointerCapture(e.pointerId);
      const { dist, mid } = measure();
      gesture = { dist, zoom, mid };
    }
  });

  wrap.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture || touches.size !== 2) return;
    const { dist, mid } = measure();
    setZoom(gesture.zoom * (dist / gesture.dist), mid);
    wrap.scrollLeft -= mid.x - gesture.mid.x;
    wrap.scrollTop -= mid.y - gesture.mid.y;
    gesture.mid = mid;
  });

  const lift = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) gesture = null;
  };
  wrap.addEventListener('pointerup', lift);
  wrap.addEventListener('pointercancel', lift);

  wrap.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(zoom * Math.exp(-e.deltaY / 100), { x: e.clientX, y: e.clientY });
    },
    { passive: false },
  );

  return {
    get zoom() {
      return zoom;
    },
    setZoom,
    onChange: (listener) => listeners.push(listener),
    setPanning(on) {
      panning = on;
      board.classList.toggle('panning', on);
    },
  };
}
