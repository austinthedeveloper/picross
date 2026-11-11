/**
 * Cubed's links. Its screens live under `#/cubed/…` in this app (routes.ts), so every link
 * and redirect between them goes through here: `cubedHref('/play/mug')` is
 * `#/cubed/play/mug`, and `cubedHref()` is Cubed's home, `#/cubed`.
 */
export const CUBED = '#/cubed';

export function cubedHref(path = '/'): string {
  return path === '/' ? CUBED : `${CUBED}${path}`;
}
