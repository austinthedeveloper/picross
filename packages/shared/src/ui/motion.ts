/** Whether the player asked their system for reduced motion. */
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Waits `ms`, or not at all with reduced motion. For pauses that only exist for an animation. */
export const pause = (ms: number) => (reducedMotion() ? Promise.resolve() : wait(ms));

/**
 * Plays a one-shot CSS animation class, even if it's already on the element,
 * and removes it afterwards so it can play again.
 */
export function playOnce(node: HTMLElement, className: string, ms = 900): void {
  node.classList.remove(className);
  void node.offsetWidth; // force a reflow so the animation restarts
  node.classList.add(className);
  window.setTimeout(() => node.classList.remove(className), ms);
}
