import { POWER_TIPS } from '@picross/story/fight/tips';

/**
 * How each enemy power is shown and explained on a block: one line, like a sign. The tips
 * for both boards are the story's (`@picross/story/fight/tips`); these are the block's,
 * written for lines that run three ways.
 */
export const POWERS: Record<string, { icon: string; name: string; tip: string }> =
  Object.fromEntries(
    Object.entries(POWER_TIPS).map(([id, { icon, name, tip }]) => [
      id,
      { icon, name, tip: tip.block },
    ]),
  );
