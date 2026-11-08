/**
 * How each enemy power is shown and explained on a block: one line, like a sign. The 2D
 * game's tips (src/ui/powers.ts there), rewritten for lines that run three ways.
 */
export const POWERS: Record<string, { icon: string; name: string; tip: string }> = {
  fog: {
    icon: '🌫️',
    name: 'Fog',
    tip: 'Some clue faces are fogged over. Work those lines out from the ones crossing them; finishing a line clears its fog.',
  },
  scramble: {
    icon: '⚙',
    name: 'Scrambled clues',
    tip: 'A dashed ring means the count is right but the pieces are scrambled: it could be one piece or several. Finishing the line puts it back.',
  },
  armor: {
    icon: '🎯',
    name: 'Armor',
    tip: 'Only ◎ target lines hurt it, for triple damage. Every 5 other lines you finish, the armor hits back. Finish the targets to break it.',
  },
  fakes: {
    icon: '🎭',
    name: 'Forged clues',
    tip: 'Some ? clues are forged, but not all. Solve those lines from the ones crossing them: honest ones get a ✓ when finished. Then tap 🔍 Call out and tap the fake.',
  },
  charge: {
    icon: '⚡',
    name: 'Charge',
    tip: 'After a warm-up, each line you finish charges the ⚡ meter; when it fills you get zapped. Finish the yellow live line first to ground it. Only finished lines count, never time.',
  },
  ink: {
    icon: '🦑',
    name: 'Ink',
    tip: 'Ink hides clues and paint on some cubes, but you can still play there. Finishing a line through it washes it off.',
  },
  swap: {
    icon: '👄',
    name: 'Swaps',
    tip: 'Two lines with your work in them get wiped back to solid cubes and flash purple. Work them out again.',
  },
  rotate: {
    icon: '🔃',
    name: 'Turns',
    tip: 'Every few lines you finish, the 🔃 meter fills and the block turns a quarter under you, and your peels drop. Only finished lines count.',
  },
};
