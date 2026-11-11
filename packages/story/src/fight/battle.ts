import { random, shuffled } from '@picross/shared/engine/random';
import type { BoardKind, FightBoard, Hidden } from './board';
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
 * block fight's saves and golden traces didn't move. The 2D game moves onto it next, with
 * `GRID_RULES`.
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
  charge?: { every: number; meter: number; live: number | null; warmUp: number };
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
  | { kind: 'phase'; phase: P; index: number }
  | { kind: 'swap'; lines: number[]; wiped: number[] }
  | { kind: 'ink'; cells: number[] }
  | { kind: 'washed'; cells: number[] }
  | { kind: 'caught'; line: number; amount: number }
  | { kind: 'honest'; line: number }
  | { kind: 'healed'; amount: number };

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
    if (enemy.charge) this.setCharge(enemy.charge);
    if (enemy.rotate) this.state.turn = { every: enemy.rotate, meter: 0 };
  }

  // --- What the player sees -----------------------------------------------------------

  /** The enemy as it is now, after any phases. */
  get current() {
    let { name, sprite, attack } = this.enemy;
    for (const phase of (this.enemy.phases ?? []).slice(0, this.state.phase + 1)) {
      name = phase.name ?? name;
      sprite = phase.sprite ?? sprite;
      attack = phase.attack ?? attack;
    }
    const armored = this.state.targets.length > 0;
    if (armored && this.enemy.armor && this.rules.armoredAttack === 'armor') {
      attack = this.enemy.armor.attack;
    }
    return { name, sprite, attack, armored };
  }

  /** The clue a line shows in this fight. Finishing a line clears fog and scrambles. */
  clueFor(line: number): C | null {
    const { state } = this;
    const truth = this.board.at().clue(line);
    const finished = state.struck.includes(line);
    if (state.fakes.includes(line)) return state.forged[line];
    if (finished) return truth;
    if (state.fog.includes(line)) return null;
    if (state.scramble.includes(line) && truth) return this.board.scrambled(truth);
    return truth;
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
    const board = this.board.at();
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
    const board = this.board.at();
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
    // A count of fakes is the first suspects, leaving at least one honest.
    this.state.fakes =
      'pool' in lying
        ? this.fromPool(lying, []).filter((id) => picked.includes(id))
        : picked.slice(0, Math.min(lying.count, Math.max(0, picked.length - 1)));
    for (const id of this.state.fakes) this.state.forged[id] = this.fakeClue(id);
  }

  /** A convincing wrong clue, as the board makes one. */
  private fakeClue(line: number): C {
    return this.board.at().fakeClue(line, this.rng);
  }

  private setCharge(every: number): void {
    const warmUp = this.state.charge?.warmUp ?? this.board.at().warmUpLines();
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
    if (!this.hitsOn || amount <= 0) return [];
    if (this.state.shield > 0) {
      this.state.shield--;
      return [{ kind: 'blocked', cause }];
    }
    return [{ kind: 'hit', amount, cause }];
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
      if (charge.warmUp > 0) {
        charge.warmUp = Math.max(0, charge.warmUp - fresh.length);
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
  private pickMore(lines: PowerLines, marks: M, kind: 'fog' | 'scramble'): number[] {
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

  /** Accuse a suspect line of being forged. */
  callOut(line: number): FightEvent<PhaseOf<E>>[] {
    const { state } = this;
    if (!state.suspects.includes(line)) return [];
    state.suspects = state.suspects.filter((id) => id !== line);
    if (state.fakes.includes(line)) {
      state.fakes = state.fakes.filter((id) => id !== line);
      delete state.forged[line];
      const before = state.enemyHp;
      state.enemyHp = Math.max(1, state.enemyHp - CALL_OUT_DAMAGE);
      return [{ kind: 'caught', line, amount: before - state.enemyHp }];
    }
    state.counts.wrongAccusations++;
    const events: FightEvent<PhaseOf<E>>[] = [{ kind: 'honest', line }];
    if (this.hitsOn) return [...events, ...this.hit(this.current.attack, 'accusation')];
    const before = state.enemyHp;
    state.enemyHp = Math.min(state.maxHp, state.enemyHp + FALSE_ACCUSATION_HEAL);
    return [...events, { kind: 'healed', amount: state.enemyHp - before }];
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
}
