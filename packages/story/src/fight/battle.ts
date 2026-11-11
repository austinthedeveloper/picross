import { random, shuffled } from '@picross/shared/engine/random';
import type { GadgetEffect } from '../puzzles/gadgets';
import type { BoardKind, BoardTurn, FightBoard, Hidden } from './board';
import type { FightRules } from './rules';

/**
 * A story fight on any board (#166): HP, phases, armor, the charge, turns, shields and
 * call-outs, written once over `FightBoard` (`board.ts`) and played by a `FightRules`
 * profile (`rules.ts`). Finishing a line chips the enemy; the solved picture is the
 * finishing blow. Enemies fight back with powers, all measured in lines finished, never in
 * time. The battle decides when each power lands and which lines it takes; the board
 * answers what depends on its cells (which lines are finished, whether it's still solvable,
 * the live line, ink, the wipe, the bomb's cells, a forgery).
 *
 * It grew out of Cubed's `Battle` (`@picross/block/game/battle`), which is now this with
 * `BLOCK_RULES`, unchanged: the same draws from the same generator, in the same order, so a
 * block fight's saves and golden traces didn't move. The 2D game's fights run on it too,
 * with `GRID_RULES`, through `gridStep` (`apps/picross/src/game/fight.ts`) and a codec that
 * keeps the 2D save's shape. The two boards take a stroke's effects in different orders
 * (`FightRules.order`): `update` and the rest of the block's API play the block's, and the
 * grid's order is the section at the end, one public step per rule, which `finished` runs
 * in order (the 2D game's `game/battle.ts` helpers are each one of them).
 *
 * Lines and cells are numbers, as on the board: a line is its id, a cell its index. `C` is
 * the board's clue, `M` its marks (what the battle hands the board: a block's cubes), and
 * `E` the enemy as the board's story reads it.
 */

export const CHIP_DAMAGE = 1;
export const TARGET_DAMAGE = 3;
export const ARMOR_HIT_LINES = 5;
export const ARMOR_HIT_DAMAGE = 2;
export const CALL_OUT_DAMAGE = 5;
export const FALSE_ACCUSATION_HEAL = 3;
export const ZAP_DAMAGE = 2;
export const BOMB_DAMAGE = 2;

/**
 * The lines a power takes. A board's story gives either a count, and the battle picks that
 * many at runtime that keep the board solvable (a block's: its lines aren't the 2D lines
 * the story names), or a `pool` of lines in priority order, proven fair offline, of which
 * it takes the first `count` (all by default) not finished or already taken (a grid's). A
 * plain number is a count.
 */
export type LinePick = { pool: readonly number[]; count?: number } | { count: number };
export type PowerLines = number | LinePick;

/** A change partway through a fight, once the enemy's HP falls to `at` of its max. */
export interface FightPhase {
  at: number;
  name?: string;
  sprite?: string;
  attack?: number;
  taunt?: string;
  fog?: PowerLines;
  scramble?: PowerLines;
  /** The Mimic's swap: two lines with the most of your work, wiped. */
  swap?: boolean;
  /** Ink splashes this many cells across, `inkCount` of them (default 1). */
  ink?: number;
  inkCount?: number;
  /** Starts or changes the charge: lines to a zap. */
  charge?: number;
  /** Starts or changes the turn: lines to a quarter turn. */
  rotate?: number;
  /** The board the phase moves the fight to (a boss that switches board). */
  board?: BoardKind;
}

/** An enemy as a battle reads it: each power's lines, and its phases. */
export interface FightEnemy {
  name: string;
  sprite: string;
  hp: number;
  attack: number;
  /** Lines starting under fog. */
  fog?: PowerLines;
  /** Lines whose clues start scrambled. */
  scramble?: PowerLines;
  /** Armor: only its `targets` hurt it, and it hits back while it's up. */
  armor?: { targets: PowerLines; attack: number };
  /** Forged clues: `fakes` of the `suspects` lie. A count of fakes is among the suspects picked. */
  fakes?: { fakes: PowerLines; suspects: PowerLines };
  /** Lines finished per zap of the charge meter. */
  charge?: number;
  /** Lines finished per quarter turn. */
  rotate?: number;
  phases?: FightPhase[];
}

/** How a fight is going, for the run's tally. */
export interface FightCounts {
  /** Breaks into the picture (a 2D save calls them `wrongFills`). */
  mistakes: number;
  zaps: number;
  wrongAccusations: number;
  gadgetsUsed: number;
  /** With `gadgetKinds`: bombs and sponges among the gadgets. */
  bombsUsed?: number;
  spongesUsed?: number;
}

/**
 * Everything about a fight that changes, as plain data (saved with the run). It's Cubed's
 * `BattleState` with a few optional fields the 2D game needs, so a block fight saved before
 * this (`picross:run.block.current`'s `battle`) loads as it is.
 */
export interface FightState<C> {
  enemyHp: number;
  maxHp: number;
  /** Index of the last phase reached, or -1. */
  phase: number;
  /** Lines that have dealt their chip damage. */
  struck: number[];
  fog: number[];
  scramble: number[];
  /** Armor's target lines still standing; empty once the armor's broken. */
  targets: number[];
  armorLines: number;
  suspects: number[];
  fakes: number[];
  /** The forged clue shown for each fake line. */
  forged: Record<number, C>;
  /**
   * The charge's meter. `warmUp` is the lines left before a line first goes live; a block
   * sets it with the charge, a grid when the charge first shows (`aim`), so a grid's charge
   * that hasn't shown yet leaves it out.
   */
  charge?: { every: number; meter: number; live: number | null; warmUp?: number };
  /**
   * The turn's meter. `turns` is the quarter turns a board that turns its lines has made,
   * 0 to 3 (a grid's, once it plays here); a block turns only its camera and leaves it out.
   */
  turn?: { every: number; meter: number; turns?: number };
  /** Cells under ink. */
  ink: number[];
  /** Lines the Mimic wiped, marked for as long as `wipeMarks` says. */
  swapped: number[];
  shield: number;
  seed: number;
  counts: FightCounts;
}

export type HitCause = 'mistake' | 'armor' | 'zap' | 'accusation';

/** Something that happened, for the screen to show and sound. */
export type FightEvent<P extends FightPhase = FightPhase> =
  | { kind: 'chip'; amount: number; lines: number[] }
  | { kind: 'armor-broken' }
  | { kind: 'hit'; amount: number; cause: HitCause }
  | { kind: 'blocked'; cause: HitCause }
  | { kind: 'grounded' }
  | { kind: 'live'; line: number }
  | { kind: 'turn' }
  /** In the grid's order, with the lines the phase just fogged and scrambled. */
  | { kind: 'phase'; phase: P; index: number; fogged?: number[]; scrambled?: number[] }
  | { kind: 'swap'; lines: number[]; wiped: number[] }
  | { kind: 'ink'; cells: number[] }
  | { kind: 'washed'; cells: number[] }
  | { kind: 'caught'; line: number; amount: number }
  | { kind: 'honest'; line: number }
  | { kind: 'healed'; amount: number };

/**
 * What the grid's order says besides (`order: 'grid'`): what lines lift, the meters, the
 * charge's aim, and the effects that wait for the caller.
 */
export type GridEvent<P extends FightPhase = FightPhase> =
  | FightEvent<P>
  /** Finished lines lifted these: fog, wipe marks, 🎭 suspects (they were honest), scrambles. */
  | { kind: 'cleared'; power: 'fog' | 'swapped' | 'suspects' | 'scramble'; lines: number[] }
  /** Armor targets finished (`broke` once none are left). */
  | { kind: 'cracked'; lines: number[]; broke: boolean }
  /** The armor's meter after lines that weren't targets (`others` of them). */
  | { kind: 'armor-meter'; lines: number; hits: number; others: number }
  | { kind: 'turn-meter'; meter: number; every: number }
  /** The charge after it aims: `every` is null when the enemy doesn't charge (or no board). */
  | {
      kind: 'charge';
      every: number | null;
      warmUp: number;
      meter: number;
      live: number | null;
      /** Whether it just picked the live line (rather than keeping it). */
      picked: boolean;
    }
  /** An effect that waits for the caller to land it (`landSwap`, `landInk`, …). */
  | { kind: 'due'; power: 'swap' | 'turn' | 'zap' | 'armor' | 'blast' }
  | { kind: 'due'; power: 'ink'; size: number; count?: number };

/** What a battle needs to know of its board. */
export interface BattleBoard<C, M> {
  /**
   * The board as the fight sees it with `marks` on it (they're what `wipe` and `reveal`
   * change), or a blank board without. Asked afresh whenever the battle needs it.
   */
  at(marks?: M): FightBoard<C>;
  /** The clue a scrambled line shows: a block's count without its pieces. */
  scrambled(clue: C): C;
}

/** A count stands for a pick of that many. */
const pickOf = (lines: PowerLines): LinePick =>
  typeof lines === 'number' ? { count: lines } : lines;

type PhaseOf<E extends FightEnemy> = NonNullable<E['phases']>[number];

export class StoryBattle<C, M, E extends FightEnemy = FightEnemy> {
  readonly state: FightState<C>;
  protected rng: () => number;
  /** The blank board, kept: clues, lines and forgeries don't depend on the marks. */
  private blankBoard: FightBoard<C> | undefined;

  constructor(
    readonly enemy: E,
    readonly rules: Readonly<FightRules>,
    readonly board: BattleBoard<C, M>,
    readonly hitsOn: boolean,
    saved?: FightState<C>,
    opts: { seed?: number; maxHp?: number; marks?: M } = {},
  ) {
    const seed = saved?.seed ?? opts.seed ?? 1;
    // The generator restarts from the seed plus the struck count, so a reload continues
    // the same way it would have.
    this.rng = random(seed + (saved?.struck.length ?? 0) * 7919);
    if (saved) {
      this.state = saved;
      return;
    }
    const maxHp = opts.maxHp ?? enemy.hp;
    this.state = {
      enemyHp: maxHp,
      maxHp,
      phase: -1,
      struck: [],
      fog: [],
      scramble: [],
      targets: [],
      armorLines: 0,
      suspects: [],
      fakes: [],
      forged: {},
      ink: [],
      swapped: [],
      shield: 0,
      seed,
      counts: { mistakes: 0, zaps: 0, wrongAccusations: 0, gadgetsUsed: 0 },
    };
    const { marks } = opts;
    if (enemy.fakes) this.forge(enemy.fakes.suspects, enemy.fakes.fakes, marks);
    if (enemy.fog) this.state.fog = this.pickLines(enemy.fog, marks, 'fog');
    if (enemy.scramble) this.state.scramble = this.pickLines(enemy.scramble, marks, 'scramble');
    if (enemy.armor) this.state.targets = this.pickTargets(enemy.armor.targets);
    if (enemy.charge) {
      // A grid's charge warms up when it first shows (`aim`), not before.
      if (rules.order === 'grid') this.state.charge = { every: enemy.charge, meter: 0, live: null };
      else this.setCharge(enemy.charge);
    }
    if (enemy.rotate) this.state.turn = { every: enemy.rotate, meter: 0 };
  }

  // --- What the player sees -----------------------------------------------------------

  /** The enemy as it is now, after any phases. */
  get current() {
    let { name, sprite, attack, charge, rotate } = this.enemy;
    for (const phase of (this.enemy.phases ?? []).slice(0, this.state.phase + 1)) {
      name = phase.name ?? name;
      sprite = phase.sprite ?? sprite;
      attack = phase.attack ?? attack;
      charge = phase.charge ?? charge;
      rotate = phase.rotate ?? rotate;
    }
    const armored = this.state.targets.length > 0;
    if (armored && this.enemy.armor && this.rules.armoredAttack === 'armor') {
      attack = this.enemy.armor.attack;
    }
    return { name, sprite, attack, charge, rotate, armored };
  }

  /** The clue a line shows in this fight. Finishing a line clears fog and scrambles. */
  clueFor(line: number): C | null {
    const { state } = this;
    const truth = this.blank.clue(line);
    const finished = state.struck.includes(line);
    if (state.fakes.includes(line)) return state.forged[line];
    if (finished) return truth;
    if (state.fog.includes(line)) return null;
    if (state.scramble.includes(line) && truth) return this.board.scrambled(truth);
    return truth;
  }

  /** The board with nothing on it, for what doesn't depend on the marks (never wiped or revealed). */
  protected get blank(): FightBoard<C> {
    return (this.blankBoard ??= this.board.at());
  }

  /** The clues hidden now, and `extra` (a pick being tried). */
  protected hidden(extra: Hidden = {}): Hidden {
    const { state } = this;
    return {
      fog: [...state.fog, ...(extra.fog ?? [])],
      scramble: [...state.scramble, ...(extra.scramble ?? [])],
      suspects: [...state.suspects, ...(extra.suspects ?? [])],
    };
  }

  /** Whether the board still solves from what's right on `marks` (blank without), with `extra` hidden too. */
  private solvable(marks: M | undefined, extra: Hidden): boolean {
    return this.board.at(marks).solvable(this.hidden(extra), marks ? 'marks' : 'blank');
  }

  // --- Picking lines ------------------------------------------------------------------

  /** Lines with a clue, nothing hidden and not finished, in a random order. */
  private candidates(skip: number[] = []): number[] {
    const { state } = this;
    const board = this.blank;
    const taken = new Set([
      ...state.fog,
      ...state.scramble,
      ...state.suspects,
      ...state.struck,
      ...skip,
    ]);
    return shuffled(
      board.lines.filter((l) => board.clue(l.id) && !taken.has(l.id)).map((l) => l.id),
      Math.floor(this.rng() * 2 ** 31),
    );
  }

  /** The first `count` (all by default) of a pool not finished or already `taken`. */
  private fromPool(pick: { pool: readonly number[]; count?: number }, taken: readonly number[]) {
    const skip = new Set([...taken, ...this.state.struck]);
    return pick.pool.filter((id) => !skip.has(id)).slice(0, pick.count ?? Infinity);
  }

  /**
   * Lines to fog or scramble: from a pool, its first open ones; for a count, up to that
   * many that keep the board solvable from what's right on `marks`.
   */
  private pickLines(lines: PowerLines, marks: M | undefined, kind: 'fog' | 'scramble'): number[] {
    const pick = pickOf(lines);
    if ('pool' in pick) return this.fromPool(pick, this.state[kind]);
    const picked: number[] = [];
    const board = this.board.at(marks);
    for (const id of this.candidates()) {
      if (picked.length >= pick.count) break;
      if (kind === 'scramble' && !board.canScramble(id)) continue;
      if (this.solvable(marks, { [kind]: [...picked, id] })) picked.push(id);
    }
    return picked;
  }

  private pickTargets(lines: PowerLines): number[] {
    const pick = pickOf(lines);
    if ('pool' in pick) return this.fromPool(pick, []);
    // Targets are lines with some of the picture in them, so finishing one takes work.
    const board = this.blank;
    return this.candidates()
      .filter((id) => board.hasShape(id))
      .slice(0, Math.max(1, pick.count));
  }

  /** Suspects, some of them forged: the board must solve without trusting any. */
  private forge(suspects: PowerLines, fakes: PowerLines, marks: M | undefined): void {
    const asked = pickOf(suspects);
    let picked: number[] = [];
    if ('pool' in asked) {
      picked = this.fromPool(asked, []);
    } else {
      for (const id of this.candidates()) {
        if (picked.length >= asked.count) break;
        if (this.solvable(marks, { suspects: [...picked, id] })) picked.push(id);
      }
    }
    this.state.suspects = picked;
    const lying = pickOf(fakes);
    // A count of fakes is the first suspects, leaving at least one honest. A pool is the
    // enemy's word, proven offline (its loader checks every fake is a suspect).
    this.state.fakes =
      'pool' in lying
        ? this.fromPool(lying, [])
        : picked.slice(0, Math.min(lying.count, Math.max(0, picked.length - 1)));
    // A grid shows its own forgeries (the 2D board view forges them from the clues as
    // drawn), so it keeps none here.
    if (this.rules.order === 'grid') return;
    for (const id of this.state.fakes) this.state.forged[id] = this.fakeClue(id);
  }

  /** A convincing wrong clue, as the board makes one. */
  private fakeClue(line: number): C {
    return this.blank.fakeClue(line, this.rng);
  }

  private setCharge(every: number): void {
    const warmUp = this.state.charge?.warmUp ?? this.blank.warmUpLines();
    this.state.charge = { every, meter: 0, live: this.state.charge?.live ?? null, warmUp };
  }

  /** A new live line for the charge: one with work left in it, not one it skips. */
  private pickLive(marks: M): number | null {
    const { state } = this;
    const skip = new Set(state.struck);
    if (this.rules.liveSkips === 'unreadable') {
      for (const id of [...state.fog, ...state.scramble, ...state.suspects]) skip.add(id);
    }
    return this.board.at(marks).pickLive(skip, this.rng);
  }

  // --- Turns of the fight -------------------------------------------------------------

  private hit(amount: number, cause: HitCause): FightEvent<PhaseOf<E>>[] {
    // A grid lands a hit of nothing too (a patch kit still takes it).
    if (!this.hitsOn || (amount <= 0 && this.rules.order === 'block')) return [];
    if (this.absorb()) return [{ kind: 'blocked', cause }];
    return [{ kind: 'hit', amount, cause }];
  }

  /** A patch kit takes a hit, if one's up. */
  absorb(): boolean {
    if (this.state.shield <= 0) return false;
    this.state.shield--;
    return true;
  }

  /** Whether a mistake or zap goes in the counts. */
  private counted(): boolean {
    return this.hitsOn || this.rules.countRelaxed;
  }

  /** A break into the picture (Hits on only): the enemy hits for its attack. */
  mistake(): FightEvent<PhaseOf<E>>[] {
    if (this.counted()) this.state.counts.mistakes++;
    return this.hit(this.current.attack, 'mistake');
  }

  /**
   * After any change to the board: newly finished lines chip the enemy, wash ink, move
   * the armor, charge and turn meters, and may bring on a phase. Changes `marks` only for
   * a swap phase.
   */
  update(marks: M): FightEvent<PhaseOf<E>>[] {
    const { state, rules } = this;
    // A grid's board reports the lines that just finished, which polling can't tell.
    if (rules.order === 'grid') throw new Error('A grid reports its lines: use finished()');
    const events: FightEvent<PhaseOf<E>>[] = [];
    const board = this.board.at(marks);
    const finished = board.finishedLines();
    const fresh = finished.filter(
      (id) => !state.struck.includes(id) && (rules.fakesCount || !state.fakes.includes(id)),
    );
    if (rules.wipeMarks === 'next-update') state.swapped = [];
    if (!fresh.length) return events;
    state.struck.push(...fresh);
    if (rules.wipeMarks === 'until-refilled') {
      state.swapped = state.swapped.filter((id) => !fresh.includes(id));
    }

    // Ink washes off the lines you finish.
    const washed = state.ink.filter((c) => fresh.some((id) => board.lines[id].cells.includes(c)));
    if (washed.length) {
      state.ink = state.ink.filter((c) => !washed.includes(c));
      events.push({ kind: 'washed', cells: washed });
    }

    // Chip damage; with armor up, only targets hurt, triple.
    let damage = 0;
    if (state.targets.length) {
      const hitTargets = fresh.filter((id) => state.targets.includes(id));
      damage = hitTargets.length * TARGET_DAMAGE;
      const others = fresh.length - hitTargets.length;
      state.targets = state.targets.filter((id) => !hitTargets.includes(id));
      if (!state.targets.length) {
        state.armorLines = 0;
        events.push({ kind: 'armor-broken' });
      } else if (others) {
        const total = state.armorLines + others;
        state.armorLines = total % ARMOR_HIT_LINES;
        const back =
          rules.armorHitBack === 'armor'
            ? (this.enemy.armor?.attack ?? ARMOR_HIT_DAMAGE)
            : ARMOR_HIT_DAMAGE;
        for (let n = 0; n < Math.floor(total / ARMOR_HIT_LINES); n++) {
          events.push(...this.hit(back, 'armor'));
        }
      }
    } else {
      damage = fresh.length * CHIP_DAMAGE;
    }
    const before = state.enemyHp;
    // Chip damage never drops the enemy below 1: only the finished picture defeats it.
    state.enemyHp = Math.max(1, state.enemyHp - damage);
    if (before > state.enemyHp)
      events.push({ kind: 'chip', amount: before - state.enemyHp, lines: fresh });

    // The charge: a warm-up, then each line fills the meter unless it's the live line.
    const charge = state.charge;
    if (charge) {
      const warmUp = charge.warmUp ?? 0;
      if (warmUp > 0) {
        charge.warmUp = Math.max(0, warmUp - fresh.length);
      } else if (charge.live !== null && fresh.includes(charge.live)) {
        charge.meter = 0;
        charge.live = null;
        events.push({ kind: 'grounded' });
      } else if (charge.live !== null) {
        charge.meter += fresh.length;
        if (charge.meter >= charge.every) {
          charge.meter = 0;
          charge.live = null;
          if (this.counted()) state.counts.zaps++;
          events.push(...this.hit(ZAP_DAMAGE, 'zap'));
        }
      }
      if (charge.warmUp === 0 && charge.live === null) {
        charge.live = this.pickLive(marks);
        if (charge.live !== null) events.push({ kind: 'live', line: charge.live });
      }
    }

    // Turns: every few lines the board turns a quarter.
    if (state.turn) {
      state.turn.meter += fresh.length;
      if (state.turn.meter >= state.turn.every) {
        state.turn.meter = 0;
        events.push({ kind: 'turn' });
      }
    }

    events.push(...this.phases(marks));
    return events;
  }

  /**
   * Picks up a fight carried over from the other board (a boss that switches board): sets
   * the enemy's HP, then starts the phases it has fallen into, picking their powers on this
   * board. Lines already struck here stay struck.
   */
  carry(enemyHp: number, marks: M): FightEvent<PhaseOf<E>>[] {
    this.state.enemyHp = Math.max(1, Math.min(this.state.maxHp, Math.round(enemyHp)));
    return this.phases(marks);
  }

  private phases(marks: M): FightEvent<PhaseOf<E>>[] {
    const { state } = this;
    const events: FightEvent<PhaseOf<E>>[] = [];
    const phases: PhaseOf<E>[] = this.enemy.phases ?? [];
    while (
      state.phase + 1 < phases.length &&
      state.enemyHp <= phases[state.phase + 1].at * state.maxHp
    ) {
      state.phase++;
      const phase = phases[state.phase];
      events.push({ kind: 'phase', phase, index: state.phase });
      // The wipe first, so new fog and scrambles are checked against the board it leaves.
      if (phase.swap) {
        const swap = this.swap(marks);
        if (swap) events.push(swap);
      }
      if (phase.fog) state.fog.push(...this.pickMore(phase.fog, marks, 'fog'));
      if (phase.scramble) state.scramble.push(...this.pickMore(phase.scramble, marks, 'scramble'));
      if (phase.charge) this.setCharge(phase.charge);
      if (phase.rotate) state.turn = { every: phase.rotate, meter: state.turn?.meter ?? 0 };
      if (phase.ink) {
        for (let n = 0; n < (phase.inkCount ?? 1); n++) {
          const cells = this.splash(phase.ink, marks);
          if (cells.length) {
            state.ink.push(...cells);
            events.push({ kind: 'ink', cells });
          }
        }
      }
    }
    return events;
  }

  /**
   * Lines for a phase's fog or scrambles. From a pool, its first open ones. For a count,
   * first ones that keep the board solvable from scratch (so undoing your work can't strand
   * you), then, if that runs short, ones that keep it solvable from what's right on the
   * board now.
   */
  private pickMore(lines: PowerLines, marks: M | undefined, kind: 'fog' | 'scramble'): number[] {
    const pick = pickOf(lines);
    if ('pool' in pick) return this.pickLines(pick, marks, kind);
    const picked = this.pickLines(pick, undefined, kind);
    if (picked.length >= pick.count) return picked;
    this.state[kind].push(...picked);
    const more = this.pickLines({ count: pick.count - picked.length }, marks, kind);
    this.state[kind].splice(this.state[kind].length - picked.length, picked.length);
    return [...picked, ...more];
  }

  /** Ink: a patch `size` across where you've done the most, outside finished lines. */
  private splash(size: number, marks: M): number[] {
    const { state } = this;
    return this.board.at(marks).pickInk(size, new Set(state.ink), new Set(state.struck), this.rng);
  }

  /** The Mimic: two lines with the most of your work in them, wiped. */
  private swap(marks: M): FightEvent<PhaseOf<E>> | null {
    const board = this.board.at(marks);
    const swap = board.pickSwap(new Set(this.state.struck));
    if (!swap) return null;
    board.wipe(swap.cells);
    this.state.swapped =
      this.rules.wipeMarks === 'next-update'
        ? swap.lines
        : [...new Set([...this.state.swapped, ...swap.lines])];
    return { kind: 'swap', lines: this.state.swapped, wiped: swap.cells };
  }

  /**
   * Accuse a suspect line of being forged: a forgery is unmasked for call-out damage; an
   * honest one lets the enemy hit, or in a Relaxed fight heal. A line that isn't a suspect
   * does nothing. (On a grid, `accuse`, which may start phases.)
   */
  callOut(line: number): FightEvent<PhaseOf<E>>[] {
    const { state } = this;
    if (!state.suspects.includes(line)) return [];
    const { caught, dealt } = this.unmask(line);
    if (caught) return [{ kind: 'caught', line, amount: dealt }];
    state.counts.wrongAccusations++;
    const events: FightEvent<PhaseOf<E>>[] = [{ kind: 'honest', line }];
    if (this.hitsOn) return [...events, ...this.hit(this.current.attack, 'accusation')];
    return [...events, { kind: 'healed', amount: this.heal() }];
  }

  /**
   * The verdict on an accused line: a forgery comes off (fakes and suspects) for call-out
   * damage, never below 1 HP; an honest suspect loses its 🎭, since you paid for the answer.
   */
  unmask(line: number): { caught: boolean; dealt: number } {
    const { state } = this;
    if (!state.fakes.includes(line)) {
      if (state.suspects.includes(line))
        state.suspects = state.suspects.filter((id) => id !== line);
      return { caught: false, dealt: 0 };
    }
    state.suspects = state.suspects.filter((id) => id !== line);
    state.fakes = state.fakes.filter((id) => id !== line);
    delete state.forged[line];
    const before = state.enemyHp;
    state.enemyHp = Math.max(1, state.enemyHp - CALL_OUT_DAMAGE);
    return { caught: true, dealt: before - state.enemyHp };
  }

  /** An honest clue accused in a Relaxed fight: the enemy touches up, to its max. Returns the HP. */
  heal(): number {
    const before = this.state.enemyHp;
    this.state.enemyHp = Math.min(this.state.maxHp, before + FALSE_ACCUSATION_HEAL);
    return this.state.enemyHp - before;
  }

  /** A suspect line you've finished whose clue was honest: it lights up. */
  isHonest(line: number): boolean {
    return (
      this.state.suspects.includes(line) &&
      !this.state.fakes.includes(line) &&
      this.state.struck.includes(line)
    );
  }

  // --- Gadgets -------------------------------------------------------------------------

  private gadget(kind?: 'bombsUsed' | 'spongesUsed'): void {
    const { counts } = this.state;
    counts.gadgetsUsed++;
    if (kind && this.rules.gadgetKinds) counts[kind] = (counts[kind] ?? 0) + 1;
  }

  /** A bomb: damage, and the cells it works out for you (the board reveals them). */
  bomb(marks: M): { events: FightEvent<PhaseOf<E>>[]; cells: number[] } {
    this.gadget('bombsUsed');
    const before = this.state.enemyHp;
    this.state.enemyHp = Math.max(1, this.state.enemyHp - BOMB_DAMAGE);
    const board = this.board.at(marks);
    const cells = board.blast(new Set(this.state.struck), this.rng);
    board.reveal(cells);
    const events: FightEvent<PhaseOf<E>>[] = [
      { kind: 'chip', amount: before - this.state.enemyHp, lines: [] },
    ];
    const washed = this.state.ink.filter((c) => cells.includes(c));
    if (washed.length) {
      this.state.ink = this.state.ink.filter((c) => !washed.includes(c));
      events.push({ kind: 'washed', cells: washed });
    }
    return { events: [...events, ...this.update(marks)], cells };
  }

  shieldUp(hits: number): void {
    this.gadget();
    this.state.shield += hits;
  }

  wash(): FightEvent<PhaseOf<E>>[] {
    this.gadget('spongesUsed');
    const cells = this.state.ink;
    this.state.ink = [];
    return cells.length ? [{ kind: 'washed', cells }] : [];
  }

  /** The solved picture lands: the rest of the enemy's HP. */
  finish(): number {
    const dealt = this.state.enemyHp;
    this.state.enemyHp = 0;
    return dealt;
  }

  /** The powers in this fight, for tip cards. */
  get powers(): string[] {
    const e = this.enemy;
    const phases: FightPhase[] = e.phases ?? [];
    const has = (key: keyof FightPhase) => phases.some((p) => p[key]);
    return [
      ...(e.fog || has('fog') ? ['fog'] : []),
      ...(e.scramble || has('scramble') ? ['scramble'] : []),
      ...(e.armor ? ['armor'] : []),
      ...(e.fakes ? ['fakes'] : []),
      ...(e.charge || has('charge') ? ['charge'] : []),
      ...(has('ink') ? ['ink'] : []),
      ...(has('swap') ? ['swap'] : []),
      ...(e.rotate || has('rotate') ? ['rotate'] : []),
    ];
  }

  // --- The grid's order (`order: 'grid'`) ----------------------------------------------
  //
  // The 2D game's fight, step by step (`FightRules.order` has the whole of it). `finished`
  // runs the steps for lines in order; the rest are what a call-out, a gadget or the
  // debug panel does, and the effects that wait (`due`), landed when the caller says. Each
  // step is public so the 2D game's helpers (`game/battle.ts`) can each be one.

  /**
   * Lines that just finished, as a grid's board reports them: their shown clue satisfied,
   * and they weren't a moment ago, so a line you refill after a swap comes again (it lifts
   * its wipe mark, but has struck already). A forged line doesn't count until it's called
   * out. `marks` is the board now, which the charge aims from; without it the charge hides.
   */
  finished(reported: readonly number[], marks?: M): GridEvent<PhaseOf<E>>[] {
    const { state, rules } = this;
    const events: GridEvent<PhaseOf<E>>[] = [];
    const lines = reported.filter((id) => rules.fakesCount || !state.fakes.includes(id));
    // A refilled line has already counted, so it can't move a meter again.
    const fresh = lines.filter((id) => !state.struck.includes(id));
    const targets = [...state.targets];

    for (const power of ['fog', 'swapped', 'suspects'] as const) {
      const cleared = this.clear(power, lines);
      if (cleared.length) events.push({ kind: 'cleared', power, lines: cleared });
    }
    const washed = this.washLines(lines);
    if (washed.length) events.push({ kind: 'washed', cells: washed });
    const unscrambled = this.clear('scramble', lines);
    if (unscrambled.length) events.push({ kind: 'cleared', power: 'scramble', lines: unscrambled });

    const chipped = this.chip(lines);
    if (chipped.cracked.length || chipped.broke) {
      events.push({ kind: 'cracked', lines: chipped.cracked, broke: chipped.broke });
    }
    // Every report chips, if only for nothing (the screen saves here).
    events.push({ kind: 'chip', amount: chipped.dealt, lines: [...lines] });
    events.push(...this.startPhases(marks));

    if (this.enemy.armor && fresh.length) {
      const { hits, others } = this.armorMeter(fresh, targets);
      events.push({ kind: 'armor-meter', lines: state.armorLines, hits, others });
      for (let n = 0; n < hits; n++) events.push({ kind: 'due', power: 'armor' });
    }
    const { rotate, charge } = this.current;
    if (rotate && fresh.length) {
      this.turnMeter(fresh);
      events.push({ kind: 'turn-meter', meter: state.turn!.meter, every: rotate });
      events.push({ kind: 'due', power: 'turn' });
    }
    if (charge && fresh.length) {
      const { grounded, zapped } = this.chargeMeter(fresh, charge);
      if (grounded) events.push({ kind: 'grounded' });
      if (zapped) events.push({ kind: 'due', power: 'zap' });
      events.push(...this.aim(marks));
    }
    return events;
  }

  /** Lifts a power from finished lines. Returns the lines it lifted, in its own order. */
  clear(power: 'fog' | 'swapped' | 'suspects' | 'scramble', lines: readonly number[]): number[] {
    const before = this.state[power];
    const cleared = before.filter((id) => lines.includes(id));
    if (cleared.length) this.state[power] = before.filter((id) => !lines.includes(id));
    return cleared;
  }

  /** Washes the ink off finished lines. Returns the cells washed. */
  washLines(lines: readonly number[]): number[] {
    const board = this.blank;
    const inLine = (c: number) => lines.some((id) => board.lines[id].cells.includes(c));
    return this.washOut(inLine);
  }

  /** Washes the ink out of these cells (a bomb's blast). Returns the cells washed. */
  washCells(cells: readonly number[]): number[] {
    return this.washOut((c) => cells.includes(c));
  }

  private washOut(washes: (cell: number) => boolean): number[] {
    const washed = this.state.ink.filter(washes);
    if (washed.length) this.state.ink = this.state.ink.filter((c) => !washes(c));
    return washed;
  }

  /**
   * Chip damage for finished lines that haven't struck yet, never below 1 HP. With armor
   * up only its targets hurt (triple), and each one cracks it.
   */
  chip(lines: readonly number[]): { dealt: number; cracked: number[]; broke: boolean } {
    const { state } = this;
    const fresh = [...new Set(lines)].filter((id) => !state.struck.includes(id));
    if (!fresh.length) return { dealt: 0, cracked: [], broke: false };
    state.struck.push(...fresh);
    let damage = fresh.length * CHIP_DAMAGE;
    let cracked: number[] = [];
    let broke = false;
    if (state.targets.length) {
      cracked = fresh.filter((id) => state.targets.includes(id));
      damage = cracked.length * TARGET_DAMAGE;
      state.targets = state.targets.filter((id) => !cracked.includes(id));
      broke = !state.targets.length;
    }
    const before = state.enemyHp;
    state.enemyHp = Math.max(1, before - damage);
    return { dealt: before - state.enemyHp, cracked, broke };
  }

  /**
   * Starts any phases the HP has fallen into, taking their fog and scrambles now and
   * setting the charge and the turn going. Their swap and ink are `due`.
   */
  startPhases(marks?: M): GridEvent<PhaseOf<E>>[] {
    const { state } = this;
    const events: GridEvent<PhaseOf<E>>[] = [];
    const phases: PhaseOf<E>[] = this.enemy.phases ?? [];
    while (
      state.phase + 1 < phases.length &&
      state.enemyHp <= phases[state.phase + 1].at * state.maxHp
    ) {
      state.phase++;
      const phase = phases[state.phase];
      const fogged = phase.fog ? this.pickMore(phase.fog, marks, 'fog') : [];
      state.fog.push(...fogged);
      const scrambled = phase.scramble ? this.pickMore(phase.scramble, marks, 'scramble') : [];
      state.scramble.push(...scrambled);
      if (phase.charge) {
        state.charge = { ...(state.charge ?? { meter: 0, live: null }), every: phase.charge };
      }
      if (phase.rotate) state.turn = { ...(state.turn ?? { meter: 0 }), every: phase.rotate };
      events.push({ kind: 'phase', phase, index: state.phase, fogged, scrambled });
      if (phase.swap) events.push({ kind: 'due', power: 'swap' });
      if (phase.ink)
        events.push({ kind: 'due', power: 'ink', size: phase.ink, count: phase.inkCount });
    }
    return events;
  }

  /**
   * The armor's meter: lines that weren't targets (`before` they landed) move it, and every
   * `ARMOR_HIT_LINES` of them it hits back. Once the armor's broken it stops.
   */
  armorMeter(
    fresh: readonly number[],
    before: readonly number[],
  ): { hits: number; others: number } {
    const { state } = this;
    if (!state.targets.length) {
      state.armorLines = 0;
      return { hits: 0, others: 0 };
    }
    const others = fresh.filter((id) => !before.includes(id)).length;
    if (!others) return { hits: 0, others };
    const total = state.armorLines + others;
    state.armorLines = total % ARMOR_HIT_LINES;
    return { hits: Math.floor(total / ARMOR_HIT_LINES), others };
  }

  /** Lines finished move the board toward its next quarter turn. */
  turnMeter(fresh: readonly number[]): void {
    if (!fresh.length) return;
    const turn = (this.state.turn ??= { every: this.current.rotate ?? 0, meter: 0 });
    turn.meter += fresh.length;
  }

  /** Whether the board is due to turn. It stays due until it turns. */
  get turnDue(): boolean {
    const every = this.current.rotate;
    return Boolean(every && (this.state.turn?.meter ?? 0) >= every);
  }

  /**
   * The charge's meter: during the warm-up, lines count it down; after, the live line among
   * them grounds it, and otherwise each one charges it toward a zap at `every`. Either way
   * the meter empties and the live line goes, for `aim` to pick another.
   */
  chargeMeter(
    fresh: readonly number[],
    every = this.current.charge ?? 0,
  ): { grounded: boolean; zapped: boolean } {
    const charge = this.state.charge;
    const none = { grounded: false, zapped: false };
    if (!charge) return none;
    if (charge.live === null) {
      if (charge.warmUp) charge.warmUp = Math.max(0, charge.warmUp - fresh.length);
      return none;
    }
    const grounded = fresh.includes(charge.live);
    charge.meter = grounded ? 0 : charge.meter + fresh.length;
    const zapped = charge.meter >= every;
    if (grounded || zapped) {
      charge.meter = 0;
      charge.live = null;
    }
    return { grounded, zapped };
  }

  /**
   * The charge makes sure a line you can read is live: the first time it shows it warms
   * up; after that it keeps the live line unless it's finished or hidden, and otherwise
   * picks another on `marks`.
   */
  aim(marks?: M): GridEvent<PhaseOf<E>>[] {
    const every = this.current.charge;
    if (!every || marks === undefined) {
      return [{ kind: 'charge', every: null, warmUp: 0, meter: 0, live: null, picked: false }];
    }
    const { state } = this;
    const board = this.board.at(marks);
    const charge = (state.charge ??= { every, meter: 0, live: null });
    if (charge.warmUp === undefined && charge.live === null) charge.warmUp = board.warmUpLines();
    if (charge.warmUp) {
      return [
        { kind: 'charge', every, warmUp: charge.warmUp, meter: 0, live: null, picked: false },
      ];
    }
    const unreadable = new Set([...state.fog, ...state.scramble, ...state.suspects]);
    const { live } = charge;
    const stays = live !== null && !unreadable.has(live) && !state.struck.includes(live);
    if (!stays) charge.live = this.pickLive(marks);
    const { meter } = charge;
    return [{ kind: 'charge', every, warmUp: 0, meter, live: charge.live, picked: !stays }];
  }

  /** A call-out (`callOut`); a forgery caught may start phases. */
  accuse(line: number): GridEvent<PhaseOf<E>>[] {
    const events: GridEvent<PhaseOf<E>>[] = this.callOut(line);
    return events.some((e) => e.kind === 'caught') ? [...events, ...this.startPhases()] : events;
  }

  /** A gadget, counted, its effect now and any phases its damage starts; a bomb's blast is due. */
  use(effect: GadgetEffect): GridEvent<PhaseOf<E>>[] {
    const kind = { blast: 'bombsUsed', wash: 'spongesUsed', shield: undefined } as const;
    this.gadget(kind[effect.kind]);
    const ink = this.state.ink;
    const dealt = this.applyGadget(effect);
    const events: GridEvent<PhaseOf<E>>[] = [];
    if (effect.kind === 'blast') events.push({ kind: 'chip', amount: dealt, lines: [] });
    if (effect.kind === 'wash' && ink.length) events.push({ kind: 'washed', cells: ink });
    events.push(...this.startPhases());
    if (effect.kind === 'blast') events.push({ kind: 'due', power: 'blast' });
    return events;
  }

  /** A gadget's effect, uncounted: a shield, a sponge, or damage (never below 1 HP). Returns the damage. */
  applyGadget(effect: GadgetEffect): number {
    if (effect.kind === 'shield') this.state.shield += effect.hits;
    else if (effect.kind === 'wash') this.state.ink = [];
    else return this.strike(effect.damage);
    return 0;
  }

  /** Damage from outside the board (the debug panel), never below 1 HP, then any phases. */
  damage(amount: number): GridEvent<PhaseOf<E>>[] {
    const dealt = this.strike(amount);
    return [{ kind: 'chip', amount: dealt, lines: [] }, ...this.startPhases()];
  }

  private strike(amount: number): number {
    const before = this.state.enemyHp;
    this.state.enemyHp = Math.max(1, before - amount);
    return before - this.state.enemyHp;
  }

  /** The turn lands, if it's due: the board turns a quarter (when it can). */
  landTurn(): GridEvent<PhaseOf<E>>[] {
    const turn = this.turnDue ? this.blank.turn() : null;
    if (!turn) return [];
    this.applyTurn(turn);
    return [{ kind: 'turn' }];
  }

  /**
   * The board turned: every line and cell the battle marks moves with it (struck lines,
   * fog, scrambles, targets, forgeries, suspects, wipe marks, ink, the live line), so they
   * stay on the same stretch of picture. The count to the next turn starts over.
   */
  applyTurn(turn: BoardTurn): void {
    const { state } = this;
    const line = (id: number) => turn.line(id);
    state.struck = state.struck.map(line);
    for (const key of ['fog', 'scramble', 'targets', 'fakes', 'suspects', 'swapped'] as const) {
      state[key] = state[key].map(line);
    }
    state.forged = Object.fromEntries(
      Object.entries(state.forged).map(([id, clue]) => [line(Number(id)), clue]),
    );
    state.ink = state.ink.map((c) => turn.cell(c));
    if (state.charge && state.charge.live !== null) state.charge.live = line(state.charge.live);
    const t = (state.turn ??= { every: this.current.rotate ?? 0, meter: 0 });
    t.turns = ((t.turns ?? 0) + 1) % 4;
    t.meter = 0;
  }

  /**
   * One of the Mimic's swaps lands: two lines with the most of your work, marked until
   * they're refilled. The caller wipes `wiped` from the board, after it saves (so the lines
   * it re-opens don't count as new).
   */
  landSwap(marks: M): GridEvent<PhaseOf<E>>[] {
    const swap = this.board.at(marks).pickSwap(new Set(this.state.struck));
    if (!swap) return [];
    this.markSwapped(swap.lines);
    return [{ kind: 'swap', lines: swap.lines, wiped: swap.cells }];
  }

  /** Marks lines the Mimic just wiped. */
  markSwapped(lines: readonly number[]): void {
    this.state.swapped = [...new Set([...this.state.swapped, ...lines])];
  }

  /** A phase's ink lands: `count` patches `size` across. */
  landInk(marks: M, size: number, count = 1): GridEvent<PhaseOf<E>>[] {
    const events: GridEvent<PhaseOf<E>>[] = [];
    for (let n = 0; n < count; n++) {
      const cells = this.splash(size, marks);
      if (cells.length) {
        this.state.ink.push(...cells);
        events.push({ kind: 'ink', cells });
      }
    }
    return events;
  }

  /** The charge's zap lands (it fizzles in a Relaxed fight). */
  landZap(): GridEvent<PhaseOf<E>>[] {
    if (this.counted()) this.state.counts.zaps++;
    return this.hit(ZAP_DAMAGE, 'zap');
  }

  /** The armor's hit back lands. */
  landHitBack(): GridEvent<PhaseOf<E>>[] {
    const back =
      this.rules.armorHitBack === 'armor'
        ? (this.enemy.armor?.attack ?? ARMOR_HIT_DAMAGE)
        : ARMOR_HIT_DAMAGE;
    return this.hit(back, 'armor');
  }

  /**
   * A bomb's blast lands: the cells it works out for you (none when nothing's left), and the
   * ink it washes out of them. The caller reveals the cells. `rng` picks the spot.
   */
  landBlast(marks: M, rng = this.rng): { events: GridEvent<PhaseOf<E>>[]; cells: number[] } {
    const cells = this.board.at(marks).blast(new Set(this.state.struck), rng);
    const washed = cells.length ? this.washCells(cells) : [];
    return { events: washed.length ? [{ kind: 'washed', cells: washed }] : [], cells };
  }
}
