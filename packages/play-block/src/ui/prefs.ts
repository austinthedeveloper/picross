/**
 * The settings the play screen reads, from the game it runs in. Cubed hands over its own
 * settings in `main.ts`; the 2D game passes what its block fights use. Until then (and in
 * tests) they're Cubed's defaults.
 */
export interface PlayPrefs {
  /** Fade the clues of finished lines. */
  dimDone: boolean;
}

const DEFAULTS: PlayPrefs = { dimDone: true };

let source: () => Readonly<PlayPrefs> = () => DEFAULTS;

export function providePlayPrefs(get: () => Readonly<PlayPrefs>): void {
  source = get;
}

export const getPlayPrefs = (): Readonly<PlayPrefs> => source();
