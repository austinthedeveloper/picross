/**
 * Saving when the page goes away. Leaving a screen saves through its cleanup, but a phone
 * can close a backgrounded tab without that ever running, so screens with progress also
 * register a save that runs whenever the page is hidden.
 */
let saver: (() => void) | null = null;

/** The current screen's save; the router clears it on every route. */
export function onHide(save: (() => void) | null): void {
  saver = save;
}

export function saveNow(): void {
  saver?.();
}
