import type { Power } from '../puzzles/enemies';

/** How each enemy power is shown and explained (#79): one line, like a sign. */
export const POWERS: Record<Power, { icon: string; name: string; tip: string }> = {
  fog: {
    icon: '🌫️',
    name: 'Fog',
    tip: 'Some clues are hidden. Work those lines out from the ones crossing them; finishing a line reveals its clue.',
  },
  scramble: {
    icon: '⚙',
    name: 'Scrambled clues',
    tip: 'The ⚙ clues have the right numbers in the wrong order. Finishing the line puts them back.',
  },
  armor: {
    icon: '🎯',
    name: 'Armor',
    tip: 'Only 🎯 lines hurt it, for triple damage. Solve them all to break the armor.',
  },
  fakes: {
    icon: '🎭',
    name: 'Forged clues',
    tip: "Some clues are fakes. A line you've filled right that won't light up is one: tap 🔍 Call out, then the clue.",
  },
  charge: {
    icon: '⚡',
    name: 'Charge',
    tip: 'The ⚡ meter fills over time and zaps you when it’s full. Finishing a line drains it.',
  },
  ink: {
    icon: '🦑',
    name: 'Ink',
    tip: 'Ink hides your marks, but you can still play there. Finishing a line through it washes it off.',
  },
  swap: {
    icon: '👄',
    name: 'Swaps',
    tip: 'Two lines get wiped clean and boxed with 👄. Fill them in again.',
  },
};
