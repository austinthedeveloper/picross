import { POWER_TIPS } from '@picross/story/fight/tips';
import type { Power } from '../puzzles/enemies';

/**
 * How each enemy power is shown and explained on the 2D board (#79): one line, like a sign.
 * The tips for both boards are the story's (`@picross/story/fight/tips`); these are the
 * flat board's.
 */
export const POWERS: Record<Power, { icon: string; name: string; tip: string }> =
  Object.fromEntries(
    Object.entries(POWER_TIPS).map(([id, { icon, name, tip }]) => [
      id,
      { icon, name, tip: tip.flat },
    ]),
  ) as Record<Power, { icon: string; name: string; tip: string }>;
