/**
 * How a fight's rules differ between the boards (#166): one field for each place the 2D
 * game's fights and Cubed's fight differently, so one `StoryBattle` (`battle.ts`) plays
 * both. Every enemy power is the same idea on either board; the two engines grew apart in
 * the details below, and moving a fight onto one battle mustn't change how it plays. So the
 * details are data: `BLOCK_RULES` is Cubed's fight exactly, `GRID_RULES` the 2D game's.
 * Unifying a rule later is a deliberate change to how fights play, with a diff in the
 * golden traces and fight ratings to show it.
 *
 * Not every difference is a rule here. Some are the board's, behind `FightBoard`
 * (`board.ts`): what a line is, the charge's warm-up (a quarter of a grid's lines, 15% of a
 * block's), which line goes live (the one you're furthest through, or any open line), where
 * ink lands, what a swap wipes and what a bomb works out. Some are the enemy's data: a 2D
 * enemy names the lines its powers take, in priority order and proven fair offline (a
 * `LinePick` with a `pool`), where a block's gives only how many and the battle picks them
 * at runtime, checking the solver can still finish (a `LinePick` with just a `count`). And
 * some are how a board's game saves a fight: `FightState` numbers phases and names its
 * counts the block's way (`phase` is the last phase's index, -1 for none, and wrong fills
 * are `mistakes`), where the 2D game's save counts the phases started and says
 * `wrongFills`; the 2D game's codec turns one into the other (#166's second half).
 */
export interface FightRules {
  /**
   * Whether a finished line still showing a forged clue (the Forger, #64) counts: chips,
   * moves the meters and clears what it hid.
   * - Block: yes. A block's lines finish by the truth (every cube right), whatever clue the
   *   line shows, so finishing a forged line is finishing it.
   * - Grid: no. A grid's line finishes when its shown clue is satisfied, which for a forgery
   *   is a lie; it counts once the forgery is called out and the line is right by its real
   *   clue.
   */
  fakesCount: boolean;

  /**
   * HP the armor's hit back costs, every `ARMOR_HIT_LINES` lines that aren't targets (the
   * Armored Beetle, #116).
   * - Block: `'armor'`, the armor's own attack (4 for every armored enemy in the story).
   * - Grid: `'fixed'`, `ARMOR_HIT_DAMAGE` (2): measured in lines, like a zap, so leaving the
   *   targets till last costs something without the armor out-hitting a mistake.
   */
  armorHitBack: 'armor' | 'fixed';

  /**
   * What the enemy hits for (a mistake, an honest suspect accused) while its armor is up.
   * - Block: `'form'`, its attack as it is (after any phases); armor changes nothing.
   * - Grid: `'armor'`, the armor's attack, until the armor breaks.
   */
  armoredAttack: 'form' | 'armor';

  /**
   * Lines the charge's live line can't be (the Electric Eel, #67).
   * - Block: `'struck'`, only lines already finished (they can't ground it again).
   * - Grid: `'unreadable'`, those and any line you can't read or trust (fogged, scrambled,
   *   🎭 suspect), so the live line is always one you can work on.
   */
  liveSkips: 'struck' | 'unreadable';

  /**
   * Whether mistakes and zaps are counted in a Relaxed fight (Hits off), for the run's tally.
   * - Block: yes, always.
   * - Grid: no. A Relaxed 2D fight doesn't check fills, and a zap fizzles there.
   */
  countRelaxed: boolean;

  /**
   * Whether the counts tell bombs and sponges apart (`bombsUsed`, `spongesUsed`), beside
   * `gadgetsUsed`.
   * - Block: no. Cubed's tally has only `gadgetsUsed`.
   * - Grid: yes. Bombs rule out gold, and sponges earn a badge (#107).
   */
  gadgetKinds: boolean;

  /**
   * How long the Mimic's wipe marks (`swapped`) last (#78).
   * - Block: `'next-update'`. They show until anything else happens on the block.
   * - Grid: `'until-refilled'`. Each wiped line stays marked until you finish it again,
   *   and a second swap adds to the marks.
   */
  wipeMarks: 'next-update' | 'until-refilled';

  /**
   * The order a stroke's finished lines take effect.
   * - Block: `'block'`. Ink washes, then chip damage or the armor takes it (and hits
   *   back), then the charge, then the turn, then any phases the HP fell into, each phase's
   *   swap first so its fog and scrambles are checked against the board it leaves. Phases
   *   start only from finished lines (and `carry`); call-outs and bombs wait for the next.
   * - Grid: lift what the lines clear (fog, ink, wipe marks, suspects, scrambles), chip,
   *   start phases, then the armor's, the turn's and the charge's meters; a call-out, a
   *   gadget or damage starts phases too. Swaps and turns wait for the stroke to end; ink,
   *   zaps, the armor's hits and a bomb's blast for the redraw (`gridStep`'s `Later`).
   *   Not played here yet: the 2D game moves onto this battle in #166's second half, which
   *   adds `'grid'`.
   */
  order: 'block';
}

/** Cubed's fight, exactly as it plays: every block fight runs on these. */
export const BLOCK_RULES: Readonly<FightRules> = Object.freeze({
  fakesCount: true,
  armorHitBack: 'armor',
  armoredAttack: 'form',
  liveSkips: 'struck',
  countRelaxed: true,
  gadgetKinds: false,
  wipeMarks: 'next-update',
  order: 'block',
});

/**
 * The 2D game's rules, for when its fights move onto `StoryBattle` (#166's second half).
 * Every field but `order` is the 2D game's already; `order` waits for `'grid'`. Until then
 * the 2D game plays on `gridStep` (`apps/picross/src/game/fight.ts`), and nothing builds a
 * battle with these.
 */
export const GRID_RULES: Readonly<Omit<FightRules, 'order'>> = Object.freeze({
  fakesCount: false,
  armorHitBack: 'fixed',
  armoredAttack: 'armor',
  liveSkips: 'unreadable',
  countRelaxed: false,
  gadgetKinds: true,
  wipeMarks: 'until-refilled',
});
