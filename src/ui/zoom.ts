export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;

export interface ZoomControl {
  readonly zoom: number;
  setZoom(zoom: number, anchor?: { x: number; y: number }): void;
  onChange(listener: (zoom: number) => void): void;
}

/**
 * Zoom and pan for the board. `wrap` is the scroll container and `board`
 * sizes its cells from the `--zoom` custom property. Two-finger pinch zooms
 * around the fingers and two-finger drag pans; Ctrl+wheel (trackpad pinch)
 * zooms on desktop.
 */
export function attachZoom(wrap: HTMLElement, board: HTMLElement): ZoomControl {
  let zoom = 1;
  const listeners: ((zoom: number) => void)[] = [];

  const setZoom = (next: number, anchor?: { x: number; y: number }) => {
    next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (next === zoom) return;
    const rect = wrap.getBoundingClientRect();
    const ax = anchor ? anchor.x - rect.left : rect.width / 2;
    const ay = anchor ? anchor.y - rect.top : rect.height / 2;
    // Keep the point under the anchor fixed while the board grows or shrinks.
    const cx = (wrap.scrollLeft + ax) / zoom;
    const cy = (wrap.scrollTop + ay) / zoom;
    zoom = next;
    board.style.setProperty('--zoom', String(zoom));
    wrap.classList.toggle('zoomed', zoom > 1);
    wrap.scrollLeft = cx * zoom - ax;
    wrap.scrollTop = cy * zoom - ay;
    listeners.forEach((l) => l(zoom));
  };

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
  };
}
