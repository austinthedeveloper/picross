import { describe, expect, it, vi } from 'vitest';
import { carryFromTray, isOver } from './brickInput';

/** A pointer event (jsdom has no PointerEvent), from pointer 1 unless given. */
function pointer(type: string, x: number, y: number, pointerId = 1): PointerEvent {
  const e = new MouseEvent(type, { clientX: x, clientY: y }) as PointerEvent;
  Object.defineProperty(e, 'pointerId', { value: pointerId });
  return e;
}

/** A plate covering (100, 100) to (300, 300). */
function plate(): Element {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 300 }) as DOMRect;
  return el;
}

function carry(signal?: AbortSignal) {
  const calls = { hover: vi.fn(), drop: vi.fn(), away: vi.fn() };
  carryFromTray(pointer('pointerdown', 0, 0), { slop: 8, target: plate(), signal, ...calls });
  return calls;
}

describe('carryFromTray', () => {
  it('a tap drops nothing: the brick stays in hand', () => {
    const calls = carry();
    window.dispatchEvent(pointer('pointermove', 3, 3));
    window.dispatchEvent(pointer('pointerup', 3, 3));
    expect(calls.hover).not.toHaveBeenCalled();
    expect(calls.drop).not.toHaveBeenCalled();
    expect(calls.away).toHaveBeenCalledOnce();
  });

  it('a drag shows it on the way, and drops it where it lets go on the plate', () => {
    const calls = carry();
    window.dispatchEvent(pointer('pointermove', 150, 150));
    window.dispatchEvent(pointer('pointerup', 200, 210));
    expect(calls.hover).toHaveBeenCalledWith(150, 150);
    expect(calls.drop).toHaveBeenCalledWith(200, 210);
    expect(calls.away).not.toHaveBeenCalled();
  });

  it('let go off the plate, or cancelled, it drops nothing', () => {
    const off = carry();
    window.dispatchEvent(pointer('pointermove', 150, 150));
    window.dispatchEvent(pointer('pointerup', 400, 400));
    expect(off.drop).not.toHaveBeenCalled();
    expect(off.away).toHaveBeenCalledOnce();

    const cancelled = carry();
    window.dispatchEvent(pointer('pointermove', 150, 150));
    window.dispatchEvent(pointer('pointercancel', 200, 200));
    expect(cancelled.drop).not.toHaveBeenCalled();
    expect(cancelled.away).toHaveBeenCalledOnce();
  });

  it('follows only its own pointer, and stops listening once it lets go', () => {
    const calls = carry();
    window.dispatchEvent(pointer('pointermove', 150, 150, 2));
    window.dispatchEvent(pointer('pointerup', 200, 200, 2));
    expect(calls.hover).not.toHaveBeenCalled();
    expect(calls.away).not.toHaveBeenCalled();
    window.dispatchEvent(pointer('pointerup', 3, 3));
    window.dispatchEvent(pointer('pointermove', 150, 150));
    window.dispatchEvent(pointer('pointerup', 200, 200));
    expect(calls.hover).not.toHaveBeenCalled();
    expect(calls.away).toHaveBeenCalledOnce();
  });

  it('stops when the screen goes', () => {
    const life = new AbortController();
    const calls = carry(life.signal);
    life.abort();
    window.dispatchEvent(pointer('pointermove', 150, 150));
    window.dispatchEvent(pointer('pointerup', 200, 200));
    expect(calls.hover).not.toHaveBeenCalled();
    expect(calls.drop).not.toHaveBeenCalled();
  });
});

describe('isOver', () => {
  it('counts the edges as over', () => {
    expect(isOver(plate(), 100, 300)).toBe(true);
    expect(isOver(plate(), 99, 200)).toBe(false);
  });
});
