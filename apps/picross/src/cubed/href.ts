/**
 * Cubed's links. Its screens live under `#/cubed/…` in this app (routes.ts), so every link
 * and redirect between them goes through here: `cubedHref('/play/mug')` is
 * `#/cubed/play/mug`, and `cubedHref()` is Cubed's list, free play's Cubed tab
 * (`#/free/cubed`) since the one home screen (#152). Home itself is the app's, `#/`.
 */
export const CUBED = '#/cubed';

/** The app's home: the one menu for both boards (#152). */
export const HOME = '#/';

/** Cubed's list: free play's Cubed tab (`freePlayHref('cubed')` in game/freePlay.ts). */
const LIST = '#/free/cubed';

export function cubedHref(path = '/'): string {
  return path === '/' ? LIST : `${CUBED}${path}`;
}
