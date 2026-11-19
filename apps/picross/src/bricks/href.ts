/**
 * The bricks route's links: everything is under `#/bricks/…`. `bricksHref()` is the picker,
 * `bricksHref('/car')` one build, `bricksHref('/car/show')` a toy's moment again.
 */
export const BRICKS = '#/bricks';

export const bricksHref = (path = ''): string => `${BRICKS}${path === '/' ? '' : path}`;

/** What a path after `#/bricks` opens. */
export type BricksPage =
  { page: 'picker' } | { page: 'build'; id: string } | { page: 'show'; id: string };

/** Reads the path after `#/bricks`: nothing (the picker), `/<id>`, or `/<id>/show`. */
export function parseBricksPath(path: string): BricksPage | null {
  if (path === '' || path === '/') return { page: 'picker' };
  const m = /^\/([\w-]+)(\/show)?$/.exec(path);
  if (!m) return null;
  return m[2] ? { page: 'show', id: m[1] } : { page: 'build', id: m[1] };
}
