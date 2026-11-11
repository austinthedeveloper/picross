import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updatePrefs } from '../game/prefs';
import { haptic, hapticsSupported } from './haptics';

// jsdom has neither navigator.vibrate nor the switch checkbox, so each test adds what it needs.
const addVibrate = () => {
  const vibrate = vi.fn<(pattern: VibratePattern) => boolean>(() => true);
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  return vibrate;
};
const addSwitch = () => {
  Object.defineProperty(HTMLInputElement.prototype, 'switch', { value: false, configurable: true });
};

beforeEach(() => updatePrefs({ haptics: true }));

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
  Reflect.deleteProperty(HTMLInputElement.prototype, 'switch');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('haptic', () => {
  it('does nothing, and says so, where the browser has no way to buzz', () => {
    expect(hapticsSupported()).toBe(false);
    expect(() => haptic('hit')).not.toThrow();
    expect(document.head.querySelector('label')).toBeNull();
  });

  it('vibrates a short tap, a firmer line, and longer patterns for hits and zaps', () => {
    const vibrate = addVibrate();
    expect(hapticsSupported()).toBe(true);
    haptic('tap');
    haptic('line');
    haptic('hit');
    haptic('zap');
    const [tap, line, hit, zap] = vibrate.mock.calls.map(([pattern]) => pattern as number[]);
    expect(tap).toHaveLength(1);
    expect(line[0]).toBeGreaterThan(tap[0]);
    expect(hit.length).toBeGreaterThan(1);
    expect(zap.length).toBeGreaterThan(hit.length);
  });

  it('stays still when haptics are off', () => {
    const vibrate = addVibrate();
    const click = vi.spyOn(HTMLElement.prototype, 'click');
    updatePrefs({ haptics: false });
    haptic('tap');
    haptic('zap');
    expect(vibrate).not.toHaveBeenCalled();
    addSwitch();
    Reflect.deleteProperty(navigator, 'vibrate');
    haptic('hit');
    expect(click).not.toHaveBeenCalled();
  });

  it('prefers vibrate over the iOS switch when both exist', () => {
    const vibrate = addVibrate();
    addSwitch();
    const click = vi.spyOn(HTMLElement.prototype, 'click');
    haptic('tap');
    expect(vibrate).toHaveBeenCalledOnce();
    expect(click).not.toHaveBeenCalled();
  });

  it('ticks a hidden switch on iOS: once right away, then the rest of the pattern', () => {
    vi.useFakeTimers();
    addSwitch();
    expect(hapticsSupported()).toBe(true);
    const clicked: HTMLElement[] = [];
    const click = vi.spyOn(HTMLElement.prototype, 'click');
    click.mockImplementation(function (this: HTMLElement) {
      clicked.push(this);
    });
    haptic('hit');
    expect(click).toHaveBeenCalledOnce(); // inside the tap, as iOS requires
    vi.runAllTimers();
    expect(click).toHaveBeenCalledTimes(2);
    for (const label of clicked) {
      expect(label.querySelector('input')?.hasAttribute('switch')).toBe(true);
      expect(label.isConnected).toBe(false);
    }
  });

  it("keeps the switch's clicks away from the page", () => {
    addSwitch();
    const onClick = vi.fn();
    document.addEventListener('click', onClick);
    haptic('tap');
    document.removeEventListener('click', onClick);
    expect(onClick).not.toHaveBeenCalled();
    expect(document.head.querySelector('label')).toBeNull();
  });
});
