/**
 * What a fight needs from a board (#163, #164): the one interface the story's fights are
 * written against, so every enemy power works on a flat grid or a block. Each board package
 * implements it over its own puzzle and its board in play: `gridFightBoard` in
 * `@picross/grid/game/fightBoard` (the block's comes with #165).
 *
 * A board knows what a line is and what's on it; the fight (HP, phases, the meters, which
 * lines a power gets) stays in the battle. So the board answers questions and makes the
 * picks that depend on the cells, and the battle decides when to ask. The two boards make
 * some picks differently (a grid's are deterministic and written to be fair, a block's are
 * random and checked by the solver at runtime), and each keeps its own: moving a fight onto
 * this interface mustn't change how any fight plays.
 *
 * Lines and cells are numbers: a line is its index in `lines`, a cell its index on the
 * board. Every method that may draw random numbers takes the battle's generator, so the
 * order of draws (which a block's saves and golden traces depend on) stays the battle's.
 * A board that doesn't draw ignores it.
 *
 * Pure: nothing here touches the page, and `C` (a line's clue) is the board's own type: a
 * grid's runs (`number[]`), a block's count and pieces.
 */

/** The two boards a fight can be on: the same names as a phase's `board`. */
export type BoardKind = 'flat' | 'block';

/** Lines whose clues the player can't read or trust, by power. */
export interface Hidden {
  /** Fogged: no clue shows (#30). */
  fog?: readonly number[];
  /** Scrambled: the runs show, but not their order (#49). */
  scramble?: readonly number[];
  /** 🎭 suspects (#64): the clue shows but may be forged, so it can't be trusted. */
  suspects?: readonly number[];
}

/** A board turned a quarter (the Weathervane, #83): where each line and cell goes. */
export interface BoardTurn {
  line(id: number): number;
  cell(index: number): number;
}

export interface FightBoard<C> {
  readonly kind: BoardKind;

  /**
   * Every line, in id order: a grid's rows then its columns, a block's lines along x, then
   * y, then z. `cells` are the board's cells in the line, in reading order. Every power
   * that marks lines (fog, scrambles, armor, forgeries, the charge, swaps) names them by id.
   */
  readonly lines: readonly { readonly id: number; readonly cells: readonly number[] }[];

  /**
   * How many lines the enemy's HP scales by: a block has more lines than the flat board,
   * so a fight there gets HP in proportion (`hp × hpLines / the flat board's hpLines`, the
   * 3D game's `scaleEnemy`), and every line finished takes the same share of the fight.
   * Every line on both boards today.
   */
  readonly hpLines: number;

  /**
   * Lines you finish before a charge first goes live (the Electric Eel, #67): a share of
   * the board, so the opening is yours. A grid waits for a quarter of its lines, a block
   * for 15% (it has far more of them).
   */
  warmUpLines(): number;

  /**
   * The line's real clue, as the fight starts from it: null when the puzzle hides it (a
   * block's free-play clues; a grid shows every one). What forgeries, scrambles and armor
   * are made from, and what a line shows once it's finished.
   */
  clue(id: number): C | null;

  /**
   * Lines finished on the board now, as this board judges it: a grid's line when its cells
   * satisfy its real clue (as the board view dims it), a block's when every cube is right
   * (`finishedLines`). Level, not edge: the battle's struck lines say which already counted.
   * Forgeries are the battle's business: a grid shows a forged clue, and its line doesn't
   * count until it's called out; a block's does.
   */
  finishedLines(): number[];

  /**
   * Whether the puzzle can still be solved without guessing with these clues hidden: from
   * a blank board (`'blank'`, so undoing your work can't strand you) or from what's
   * correctly on the board now (`'marks'`). A block checks every runtime pick of fog,
   * scrambles and suspects with it; a grid's are proven offline, and it can only check from
   * blank, so `'marks'` asks the stricter question there.
   */
  solvable(hidden: Hidden, from: 'blank' | 'marks'): boolean;

  /** Whether a scramble would hide anything: the line's runs have more than one order (#49). */
  canScramble(id: number): boolean;

  /** Whether any of the line's cells are in the picture: the armor's targets need some (#50). */
  hasShape(id: number): boolean;

  /**
   * A convincing wrong clue for the line (the Forger, #64): it could be true of the line,
   * but isn't. A grid's is deterministic (`fakeClue`); a block's draws once.
   */
  fakeClue(id: number, rng: () => number): C;

  /**
   * The line a charging enemy goes live on (#67): one with work left in it, not in `skip`
   * (lines already struck, and on a grid lines you can't read). Null if none can. A grid
   * picks the line you're furthest through (`pickLiveLine`); a block any open line.
   */
  pickLive(skip: ReadonlySet<number>, rng: () => number): number | null;

  /**
   * Where ink lands (the Cuttlefish, #67): new cells to ink, a patch `size` across, none
   * already in `inked` or in a `done` line's cells (finishing a line washes it, so ink never
   * lands there). A grid's goes where it hides the most of your marks (`pickInk`); a
   * block's on a layer, around a cube you've painted. Empty when there's nowhere left.
   */
  pickInk(
    size: number,
    inked: ReadonlySet<number>,
    done: ReadonlySet<number>,
    rng: () => number,
  ): number[];

  /**
   * The Mimic's swap (#48, #78): up to two unfinished lines holding the most of your work,
   * and the cells it wipes (`cells`, each once). Null when no swap would cost anything. It
   * doesn't wipe: the caller saves the wipe marks first, then calls `wipe`. A grid swaps
   * two rows or two columns, unfinished by the truth on the board, so `done` is what it
   * would skip anyway; a block any two lines not in `done`.
   */
  pickSwap(done: ReadonlySet<number>): { lines: number[]; cells: number[] } | null;

  /** Clears these cells back to blank: the Mimic's wipe. */
  wipe(cells: readonly number[]): void;

  /**
   * Where a bomb goes off (#115): the cells it works out for you. A grid's is a square
   * where at least half is unsolved (`pickBlast`), whatever `done` says; a block's is the
   * cells of one open line not in `done` that aren't right yet. Empty when nothing's left.
   * It doesn't reveal them: `reveal` does.
   */
  blast(done: ReadonlySet<number>, rng: () => number): number[];

  /** Puts the truth in these cells: what a bomb (or a hint) does. */
  reveal(cells: readonly number[]): void;

  /**
   * How a quarter turn moves lines and cells (the Weathervane, #83), so everything the
   * battle marks turns with the board. Null when this board doesn't turn its lines: a
   * block turns only the camera, and a grid that isn't square can't turn.
   */
  turn(): BoardTurn | null;
}
