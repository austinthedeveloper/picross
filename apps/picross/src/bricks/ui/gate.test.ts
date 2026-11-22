import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { providePrefs } from '@picross/shared/game/prefs';
import { HOLD_MS, parentGate } from './gate';

const press = (button: HTMLElement, type: string) =>
  button.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

beforeEach(() => {
  vi.useFakeTimers();
  let prefs = { muted: false };
  providePrefs({
    get: () => prefs as never,
    update: (p) => void (prefs = { ...prefs, ...p }),
  });
});
afterEach(() => vi.useRealTimers());

describe('the grown-ups’ gate', () => {
  it('opens only after a hold of two seconds', () => {
    const run = vi.fn();
    const gate = parentGate([{ label: 'Start over', run }]);
    document.body.append(gate.button, gate.panel);
    press(gate.button, 'pointerdown');
    vi.advanceTimersByTime(HOLD_MS - 100);
    expect(gate.panel.open).toBe(false);
    vi.advanceTimersByTime(200);
    expect(gate.panel.open).toBe(true);
    gate.dispose();
  });

  it('a tap, or letting go early, does nothing', () => {
    const gate = parentGate([]);
    press(gate.button, 'pointerdown');
    vi.advanceTimersByTime(1000);
    press(gate.button, 'pointerup');
    vi.advanceTimersByTime(HOLD_MS * 2);
    expect(gate.panel.open).toBe(false);
    press(gate.button, 'click');
    expect(gate.panel.open).toBe(false);
  });

  it('a careful action asks again before it runs', () => {
    const run = vi.fn();
    const gate = parentGate([{ label: 'Clear the shelf', confirm: true, run }]);
    const button = [...gate.panel.querySelectorAll('button')].find((b) =>
      b.textContent?.startsWith('Clear the shelf'),
    )!;
    button.click();
    expect(run).not.toHaveBeenCalled();
    expect(button.textContent).toBe('Clear the shelf? Tap again');
    button.click();
    expect(run).toHaveBeenCalledOnce();
  });

  it('has the way out, and sound', () => {
    const gate = parentGate([], '#/');
    expect(gate.panel.querySelector('a')?.getAttribute('href')).toBe('#/');
    expect(gate.panel.querySelector('.mute')).not.toBeNull();
  });
});
