import type { BoardKind } from './board';

/**
 * Power tips on both boards (#79, #167): how each enemy power is shown and explained, one
 * line like a sign, the first time you meet it. Every power plays on either board (the one
 * battle, `battle.ts`), so each tip has a version for each: `tip.flat` for the 2D board
 * (`apps/picross/src/ui/powers.ts` reads it), `tip.block` for a block
 * (`@picross/block/story/powers`).
 *
 * A power you've met on one board isn't explained again on the other, unless it works
 * differently there: then it has a `note` for each board, a short "on a block" or "on a
 * flat board" line shown once you've already had the full tip on the other. `tipToShow`
 * decides which card a fight shows, and which keys the run's save records once you've seen
 * it. The script review site shows every tip and note (`power/<id>`, `power/<id>/block`,
 * `power/<id>/note/flat`, `power/<id>/note/block`).
 */

export type PowerName =
  'fog' | 'scramble' | 'armor' | 'fakes' | 'charge' | 'ink' | 'swap' | 'rotate';

export interface PowerTip {
  icon: string;
  name: string;
  /** The full tip, the first time you meet the power, on each board. */
  tip: Record<BoardKind, string>;
  /**
   * For a power that works differently on the two boards: what's different on each, for
   * when you've met the power on the other board already.
   */
  note?: Record<BoardKind, string>;
}

export const POWER_TIPS: Record<PowerName, PowerTip> = {
  fog: {
    icon: '🌫️',
    name: 'Fog',
    tip: {
      flat: 'Some clues are hidden. Work those lines out from the ones crossing them; finishing a line reveals its clue.',
      block:
        'Some clue faces are fogged over. Work those lines out from the ones crossing them; finishing a line clears its fog.',
    },
  },
  scramble: {
    icon: '⚙',
    name: 'Scrambled clues',
    tip: {
      flat: 'The ⚙ clues have the right numbers in the wrong order. Finishing the line puts them back.',
      block:
        'A dashed ring means the count is right but the pieces are scrambled: it could be one piece or several. Finishing the line puts it back.',
    },
    // A grid's runs come out of order; a block's clue loses its pieces.
    note: {
      flat: 'On a flat board, a ⚙ clue shows the right numbers in the wrong order. Finishing the line puts them back.',
      block:
        'On a block, a scrambled clue keeps its count but loses its pieces: a dashed ring could be one piece or several.',
    },
  },
  armor: {
    icon: '🎯',
    name: 'Armor',
    tip: {
      flat: 'Only 🎯 lines hurt it, for triple damage. Every 5 other lines you finish, the armor hits back. Solve the 🎯 lines to break it.',
      block:
        'Only ◎ target lines hurt it, for triple damage. Every 5 other lines you finish, the armor hits back. Finish the targets to break it.',
    },
  },
  fakes: {
    icon: '🎭',
    name: 'Forged clues',
    tip: {
      flat: "Some 🎭 clues are fakes, but not all. Don't trust them: solve those lines from the ones crossing them. Honest ones light up; a fake stays dark. Then 🔍 Call out the fake.",
      block:
        'Some ? clues are forged, but not all. Solve those lines from the ones crossing them: honest ones get a ✓ when finished. Then tap 🔍 Call out and tap the fake.',
    },
  },
  charge: {
    icon: '⚡',
    name: 'Charge',
    tip: {
      flat: 'After a warm-up, each line you finish charges the ⚡ meter, and when it’s full you get zapped. Finish the yellow live line first to ground it. Take as long as you like: only finished lines count.',
      block:
        'After a warm-up, each line you finish charges the ⚡ meter; when it fills you get zapped. Finish the yellow live line first to ground it. Only finished lines count, never time.',
    },
  },
  ink: {
    icon: '🦑',
    name: 'Ink',
    tip: {
      flat: 'Ink hides your marks, but you can still play there. Finishing a line through it washes it off.',
      block:
        'Ink hides clues and paint on some cubes, but you can still play there. Finishing a line through it washes it off.',
    },
    // A grid's ink is a square of cells; a block's a patch across one layer.
    note: {
      flat: 'On a flat board, ink covers a square of cells and hides your marks there. Finishing a line through it still washes it off.',
      block:
        'On a block, ink splashes across a patch of one layer, hiding the clues and paint on those cubes. Finishing a line through it still washes it off.',
    },
  },
  swap: {
    icon: '👄',
    name: 'Swaps',
    tip: {
      flat: 'Two lines get wiped clean and boxed with 👄. Fill them in again.',
      block:
        'Two lines with your work in them get wiped back to solid cubes and flash purple. Work them out again.',
    },
    // A grid's two rows or two columns; a block's two lines along any axes.
    note: {
      flat: 'On a flat board, the two lines are two rows or two columns, wiped clean and boxed with 👄 until you fill them in again.',
      block:
        'On a block, the two lines can run along any axis, and go back to solid cubes that flash purple. Work them out again.',
    },
  },
  rotate: {
    icon: '🔃',
    name: 'Turns',
    tip: {
      flat: 'Every few lines you finish, the 🔃 meter fills and the whole board turns a quarter clockwise. Your marks, clues and everything on them turn too: rows become columns. Only finished lines count.',
      block:
        'Every few lines you finish, the 🔃 meter fills and the block turns a quarter under you, and your peels drop. Only finished lines count.',
    },
    // A grid's lines turn (rows become columns); a block turns only the camera.
    note: {
      flat: 'On a flat board, the board itself turns: rows become columns, and your marks and clues turn with them.',
      block:
        'On a block, only your view turns: the block swings a quarter under you and your peels drop, but every line and clue stays where it was.',
    },
  },
};

export const isPower = (power: string): power is PowerName => Object.hasOwn(POWER_TIPS, power);

/** A tip card to show: the full tip or a board's note, and the keys that record it as seen. */
export interface TipCard {
  power: PowerName;
  icon: string;
  name: string;
  text: string;
  /** Whether it's the board's note for a power you've met on the other board. */
  note: boolean;
  /** What the run's save records once it's seen. */
  keys: string[];
}

/**
 * The tip card a fight on `board` shows for `power`, given the tips already seen (`seen`, a
 * run save's `seenTips`): null when there's nothing new to explain.
 *
 * A seen tip is recorded by the power's name (its idea has been explained), and, for a power
 * with a `note`, by `<power>:<board>` for each board it's been explained on. So a power
 * met on one board shows nothing on the other, and one that works differently shows the
 * other board's note once. A save from before tips knew their board has only the name:
 * those were seen on `home`, the board that save's game plays on (the 2D game's `flat`,
 * Cubed's `block`), which is recorded beside the note's key when the note is seen.
 */
export function tipToShow(
  power: string,
  board: BoardKind,
  seen: (key: string) => boolean,
  home: BoardKind,
): TipCard | null {
  if (!isPower(power)) return null;
  const { icon, name, tip, note } = POWER_TIPS[power];
  const on = (b: BoardKind) => `${power}:${b}`;
  if (!seen(power)) {
    return {
      power,
      icon,
      name,
      text: tip[board],
      note: false,
      keys: [power, ...(note ? [on(board)] : [])],
    };
  }
  if (!note) return null;
  const legacy = !seen(on('flat')) && !seen(on('block'));
  if (legacy ? board === home : seen(on(board))) return null;
  return {
    power,
    icon,
    name,
    text: note[board],
    note: true,
    keys: legacy ? [on(home), on(board)] : [on(board)],
  };
}
