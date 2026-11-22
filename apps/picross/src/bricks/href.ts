/**
 * The bricks route's links: everything is under `#/bricks/…`. `bricksHref()` is the picker,
 * `bricksHref('/car')` one build, `bricksHref('/car/show')` a toy's moment again, and
 * `bricksHref('/car/steps')` its steps for real bricks (`/car/steps/2`: step 2; 0 is the
 * parts list).
 */
export const BRICKS = '#/bricks';

export const bricksHref = (path = ''): string => `${BRICKS}${path === '/' ? '' : path}`;

/** What a path after `#/bricks` opens. */
export type BricksPage =
  | { page: 'picker' }
  | { page: 'build'; id: string }
  | { page: 'show'; id: string }
  /** `step` is null for `/steps` alone: the step it was last on. */
  | { page: 'steps'; id: string; step: number | null };

/**
 * Reads the path after `#/bricks`: nothing (the picker), `/<id>`, `/<id>/show`, or
 * `/<id>/steps` with an optional step.
 */
export function parseBricksPath(path: string): BricksPage | null {
  if (path === '' || path === '/') return { page: 'picker' };
  const m = /^\/([\w-]+)(?:\/(show)|\/(steps)(?:\/(\d+))?)?$/.exec(path);
  if (!m) return null;
  if (m[2]) return { page: 'show', id: m[1] };
  if (m[3]) return { page: 'steps', id: m[1], step: m[4] === undefined ? null : Number(m[4]) };
  return { page: 'build', id: m[1] };
}
