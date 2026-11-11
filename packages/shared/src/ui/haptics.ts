import { getPrefs } from '../game/prefs';

/**
 * A light tap when a stroke starts, a firmer one when a line completes, and a
 * pattern of its own for a mistake or hit and for a zap.
 */
export type Haptic = 'tap' | 'line' | 'hit' | 'zap';

/** Vibration patterns in ms: on, off, on, and so on. */
const PATTERNS: Record<Haptic, number[]> = {
  tap: [8],
  line: [22],
  hit: [40, 60, 40],
  zap: [12, 30, 12, 30, 12, 30, 50],
};

/**
 * Ticks for the iOS fallback. Each one is the system's fixed switch tick, so a
 * pattern can only be a count: a line feels like a tap there.
 */
const TICKS: Record<Haptic, number> = { tap: 1, line: 1, hit: 2, zap: 3 };
const TICK_GAP = 70;

type Method = 'vibrate' | 'switch' | null;

/**
 * How this browser can buzz. Most phones have `navigator.vibrate`. iOS Safari
 * doesn't, but toggling an `<input type="checkbox" switch>` (Safari 17.4+) plays the
 * system haptic, and clicking its label from script does too while a tap is being
 * handled. Apple restricted that in iOS 26.5, where it does nothing; it costs nothing
 * to try, and older iPhones still feel it.
 */
function method(): Method {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    return 'vibrate';
  }
  if (typeof HTMLInputElement !== 'undefined' && 'switch' in HTMLInputElement.prototype) {
    return 'switch';
  }
  return null;
}

/** Whether this browser has any way to buzz, so the setting is worth showing. */
export function hapticsSupported(): boolean {
  return method() !== null;
}

/** One iOS switch tick: a hidden switch, clicked through its label, then removed. */
function tick(): void {
  const label = document.createElement('label');
  label.ariaHidden = 'true';
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  // The clicks are only for the buzz, so the page's own click handlers never see them.
  label.addEventListener('click', (e) => e.stopPropagation());
  document.head.append(label);
  label.click();
  label.remove();
}

/** Buzzes the phone unless haptics are off. Does nothing where it can't. */
export function haptic(kind: Haptic): void {
  if (!getPrefs().haptics) return;
  try {
    const how = method();
    if (how === 'vibrate') navigator.vibrate(PATTERNS[kind]);
    else if (how === 'switch') {
      // The first tick runs inside the tap that caused it, which iOS requires.
      tick();
      for (let n = 1; n < TICKS[kind]; n++) window.setTimeout(tick, n * TICK_GAP);
    }
  } catch {
    // Haptics unavailable; carry on without them.
  }
}
