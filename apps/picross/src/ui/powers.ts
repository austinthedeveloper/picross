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
    tip: 'Only 🎯 lines hurt it, for triple damage. Every 5 other lines you finish, the armor hits back. Solve the 🎯 lines to break it.',
  },
  fakes: {
    icon: '🎭',
    name: 'Forged clues',
    tip: "Some 🎭 clues are fakes, but not all. Don't trust them: solve those lines from the ones crossing them. Honest ones light up; a fake stays dark. Then 🔍 Call out the fake.",
  },
  charge: {
    icon: '⚡',
    name: 'Charge',
    tip: 'After a warm-up, each line you finish charges the ⚡ meter, and when it’s full you get zapped. Finish the yellow live line first to ground it. Take as long as you like: only finished lines count.',
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
  rotate: {
    icon: '🔃',
    name: 'Turns',
    tip: 'Every few lines you finish, the 🔃 meter fills and the whole board turns a quarter clockwise. Your marks, clues and everything on them turn too: rows become columns. Only finished lines count.',
  },
};
