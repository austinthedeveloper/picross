/**
 * The grown-ups' corner: a small lock that opens only when held for three seconds, so a
 * little one tapping about never lands in it. Behind it, in words (they're for grown-ups):
 * sound on or off, whatever the screen offers (start over, clear the shelf), and the way
 * out to the rest of the app.
 */
import { createMuteButton } from '@picross/shared/ui/components/muteButton';
import { el } from '@picross/shared/ui/dom';
import { icon } from './icons';

/** How long the lock is held to open, in ms. */
export const HOLD_MS = 3000;

export interface GateAction {
  label: string;
  /** Asks "Sure?" on the first tap, and does it on the second. */
  confirm?: boolean;
  run(): void;
}

export interface Gate {
  /** The lock, for the top bar. */
  button: HTMLButtonElement;
  /** The grown-ups' panel (a dialog; add it to the screen). */
  panel: HTMLDialogElement;
  /** Stops the hold's timers (the screen's cleanup). */
  dispose(): void;
}

export function parentGate(actions: GateAction[], leave = '#/'): Gate {
  const ring = el('span', { className: 'bk-gate-ring', ariaHidden: 'true' });
  const button = el(
    'button',
    {
      className: 'bk-gate',
      type: 'button',
      ariaLabel: 'Grown-ups: press and hold for three seconds',
      title: 'Grown-ups: press and hold',
    },
    [ring, icon('lock')],
  );
  const panel = el('dialog', { className: 'bk-grownups', ariaLabel: 'Grown-ups' });
  const close = () => {
    if (panel.open) panel.close?.();
    panel.open = false;
  };
  panel.append(
    el('h2', { textContent: 'Grown-ups' }),
    createMuteButton(),
    ...actions.map((a) => {
      const b = el('button', { className: 'button', type: 'button', textContent: a.label });
      let armed = false;
      b.onclick = () => {
        if (a.confirm && !armed) {
          armed = true;
          b.textContent = `${a.label}? Tap again`;
          return;
        }
        close();
        a.run();
      };
      return b;
    }),
    el('a', { className: 'button ghost', href: leave, textContent: 'Leave for the main menu' }),
    el('button', {
      className: 'button primary',
      type: 'button',
      textContent: 'Back to building',
      onclick: close,
    }),
  );

  let timer = 0;
  let frame = 0;
  let started = 0;
  const show = (p: number) => ring.style.setProperty('--p', String(p));
  const tick = () => {
    show(Math.min(1, (performance.now() - started) / HOLD_MS));
    frame = requestAnimationFrame(tick);
  };
  const begin = () => {
    if (timer) return;
    started = performance.now();
    button.classList.add('holding');
    tick();
    timer = window.setTimeout(() => {
      stop();
      if (typeof panel.showModal === 'function') panel.showModal();
      else panel.open = true;
    }, HOLD_MS);
  };
  const stop = () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    timer = 0;
    button.classList.remove('holding');
    show(0);
  };
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    button.setPointerCapture?.(e.pointerId);
    begin();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    button.addEventListener(type, stop);
  // Holding Enter or Space works too.
  button.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) begin();
    if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
  });
  button.addEventListener('keyup', stop);
  button.addEventListener('contextmenu', (e) => e.preventDefault());
  button.addEventListener('click', (e) => e.preventDefault());

  return { button, panel, dispose: stop };
}
