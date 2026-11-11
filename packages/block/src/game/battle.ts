import type { Hidden } from '@picross/story/fight/board';
import type { Clue } from '../engine/clues';
import { random, shuffled } from '@picross/shared/engine/random';
import type { Puzzle } from '../puzzles/format';
import type { Enemy, Phase } from '../story/data';
import { blockFightBoard, type BlockFightBoard } from './fightBoard';

export { finishedLines, WARM_UP_SHARE } from './fightBoard';

/**
 * A story fight on a block: the 2D game's battle rules (src/game/battle.ts there), with
 * lines along three axes. Finishing a line (every cube that isn't the shape broken, none
 * that is) chips the enemy; the solved shape is the finishing blow. Enemies fight back
 * with powers, all measured in lines finished, never in time. Each power picks its lines
 * when it lands, checking the block can still be solved from what's on it. What depends on
 * the cubes (the solver check, the live line, ink, the wipe, the bomb's line, forgeries) is
 * the block's `FightBoard` (`fightBoard.ts`, #165); the battle decides when to ask.
 */

export const CHIP_DAMAGE = 1;
export const TARGET_DAMAGE = 3;
export const ARMOR_HIT_LINES = 5;
export const ARMOR_HIT_DAMAGE = 2;
export const CALL_OUT_DAMAGE = 5;
export const FALSE_ACCUSATION_HEAL = 3;
export const ZAP_DAMAGE = 2;
export const BOMB_DAMAGE = 2;

export interface FightCounts {
  mistakes: number;
  zaps: number;
  wrongAccusations: number;
  gadgetsUsed: number;
}

/** Everything about a fight that changes, as plain data (saved with the run). */
export interface BattleState {
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
  forged: Record<number, Clue>;
  charge?: { every: number; meter: number; live: number | null; warmUp: number };
  turn?: { every: number; meter: number };
  /** Cubes under ink. */
  ink: number[];
  /** Lines the Mimic just wiped, shown until something else happens. */
  swapped: number[];
  shield: number;
  seed: number;
  counts: FightCounts;
}

/** Something that happened, for the screen to show and sound. */
export type BattleEvent =
  | { kind: 'chip'; amount: number; lines: number[] }
  | { kind: 'armor-broken' }
  | { kind: 'hit'; amount: number; cause: 'mistake' | 'armor' | 'zap' | 'accusation' }
  | { kind: 'blocked'; cause: 'mistake' | 'armor' | 'zap' | 'accusation' }
  | { kind: 'grounded' }
  | { kind: 'live'; line: number }
  | { kind: 'turn' }
  | { kind: 'phase'; phase: Phase; index: number }
  | { kind: 'swap'; lines: number[]; wiped: number[] }
  | { kind: 'ink'; cells: number[] }
  | { kind: 'washed'; cells: number[] }
  | { kind: 'caught'; line: number; amount: number }
  | { kind: 'honest'; line: number }
  | { kind: 'healed'; amount: number };

export class Battle {
  readonly state: BattleState;
  /**
   * The clues the fight starts from. Free play hides about half the clues; an enemy that
   * hides clues itself (fog, scrambles, forgeries) starts from all of them instead, so its
   * powers have room and the block stays solvable.
   */
  readonly base: (Clue | null)[];
  private rng: () => number;

  constructor(
    readonly enemy: Enemy,
    readonly puzzle: Puzzle,
    readonly hitsOn: boolean,
    saved?: BattleState,
    opts: { seed?: number; maxHp?: number; blocks?: Uint8Array } = {},
  ) {
    const seed = saved?.seed ?? opts.seed ?? 1;
    const phases = enemy.phases ?? [];
    const hides =
      Boolean(enemy.fog || enemy.scramble || enemy.fakes) ||
      phases.some((p) => p.fog || p.scramble);
    this.base = hides ? [...puzzle.allClues] : [...puzzle.clues];
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
    const blocks = opts.blocks ?? new Uint8Array(puzzle.solution.length);
    if (enemy.fakes) this.forge(enemy.fakes.suspects, enemy.fakes.fakes, blocks);
    if (enemy.fog) this.state.fog = this.pickLines(enemy.fog, blocks, 'fog');
    if (enemy.scramble) this.state.scramble = this.pickLines(enemy.scramble, blocks, 'scramble');
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
    return { name, sprite, attack, armored: this.state.targets.length > 0 };
  }

  /** The clue a line shows in this fight. Finishing a line clears fog and scrambles. */
  clueFor(line: number): Clue | null {
    const { state } = this;
    const truth = this.base[line];
    const finished = state.struck.includes(line);
    if (state.fakes.includes(line)) return state.forged[line];
    if (finished) return truth;
    if (state.fog.includes(line)) return null;
    if (state.scramble.includes(line) && truth) return { count: truth.count, pieces: null };
    return truth;
  }

  /** The clues a player can trust right now (for hints): no fog, no suspects. */
  hintClues(): (Clue | null)[] {
    const finished = new Set(this.state.struck);
    return this.board()
      .readableClues(this.hidden())
      .map((c, i) => (finished.has(i) ? this.base[i] : c));
  }

  /** The block with `blocks` on it (a blank one without), as the fight sees it (#165). */
  private board(blocks?: Uint8Array): BlockFightBoard {
    return blockFightBoard(this.puzzle, blocks && { blocks }, this.base);
  }

  /** The clues hidden now, and `extra` (a pick being tried). */
  private hidden(extra: Hidden = {}): Hidden {
    const { state } = this;
    return {
      fog: [...state.fog, ...(extra.fog ?? [])],
      scramble: [...state.scramble, ...(extra.scramble ?? [])],
      suspects: [...state.suspects, ...(extra.suspects ?? [])],
    };
  }

  /** Whether the block still solves from what's right on `blocks`, with `extra` hidden too. */
  private solvable(blocks: Uint8Array, extra: Hidden): boolean {
    return this.board(blocks).solvable(this.hidden(extra), 'marks');
  }

  // --- Picking lines ------------------------------------------------------------------

  private candidates(skip: number[] = []): number[] {
    const { state, puzzle } = this;
    const taken = new Set([
      ...state.fog,
      ...state.scramble,
      ...state.suspects,
      ...state.struck,
      ...skip,
    ]);
    return shuffled(
      puzzle.lines.filter((l) => this.base[l.id] && !taken.has(l.id)).map((l) => l.id),
      Math.floor(this.rng() * 2 ** 31),
    );
  }

  /** Up to `count` lines to fog or scramble that keep the block solvable. */
  private pickLines(count: number, blocks: Uint8Array, kind: 'fog' | 'scramble'): number[] {
    const picked: number[] = [];
    const board = this.board(blocks);
    for (const id of this.candidates()) {
      if (picked.length >= count) break;
      if (kind === 'scramble' && !board.canScramble(id)) continue;
      if (this.solvable(blocks, { [kind]: [...picked, id] })) picked.push(id);
    }
    return picked;
  }

  private pickTargets(count: number): number[] {
    // Targets are lines with cubes of the shape in them, so finishing one takes work.
    const board = this.board();
    return this.candidates()
      .filter((id) => board.hasShape(id))
      .slice(0, Math.max(1, count));
  }

  /** Suspects, `fakes` of them forged: the block must solve without trusting any. */
  private forge(suspects: number, fakes: number, blocks: Uint8Array): void {
    const picked: number[] = [];
    for (const id of this.candidates()) {
      if (picked.length >= suspects) break;
      if (this.solvable(blocks, { suspects: [...picked, id] })) picked.push(id);
    }
    this.state.suspects = picked;
    this.state.fakes = picked.slice(0, Math.min(fakes, Math.max(0, picked.length - 1)));
    for (const id of this.state.fakes) this.state.forged[id] = this.fakeClue(id);
  }

  /** A convincing wrong clue: one more or one fewer, with a frame that could be true. */
  private fakeClue(line: number): Clue {
    return this.board().fakeClue(line, this.rng);
  }

  private setCharge(every: number): void {
    const warmUp = this.state.charge?.warmUp ?? this.board().warmUpLines();
    this.state.charge = { every, meter: 0, live: this.state.charge?.live ?? null, warmUp };
  }

  /** A new live line for the charge: one with work left in it, not one already struck. */
  private pickLive(blocks: Uint8Array): number | null {
    return this.board(blocks).pickLive(new Set(this.state.struck), this.rng);
  }

  // --- Turns of the fight -------------------------------------------------------------

  private hit(
    amount: number,
    cause: Extract<BattleEvent, { kind: 'hit' }>['cause'],
  ): BattleEvent[] {
    if (!this.hitsOn || amount <= 0) return [];
    if (this.state.shield > 0) {
      this.state.shield--;
      return [{ kind: 'blocked', cause }];
    }
    return [{ kind: 'hit', amount, cause }];
  }

  /** A break into the shape (Hits on only): the enemy hits for its attack. */
  mistake(): BattleEvent[] {
    this.state.counts.mistakes++;
    return this.hit(this.current.attack, 'mistake');
  }

  /**
   * After any change to the board: newly finished lines chip the enemy, wash ink, move
   * the armor, charge and turn meters, and may bring on a phase. Mutates `blocks` only
   * for a swap phase.
   */
  update(blocks: Uint8Array): BattleEvent[] {
    const { state } = this;
    const events: BattleEvent[] = [];
    const finished = this.board(blocks).finishedLines();
    const fresh = finished.filter((id) => !state.struck.includes(id));
    state.swapped = [];
    if (!fresh.length) return events;
    state.struck.push(...fresh);

    // Ink washes off the lines you finish.
    const washed = state.ink.filter((c) =>
      fresh.some((id) => this.puzzle.lines[id].cells.includes(c)),
    );
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
        for (let n = 0; n < Math.floor(total / ARMOR_HIT_LINES); n++) {
          events.push(...this.hit(this.enemy.armor?.attack ?? ARMOR_HIT_DAMAGE, 'armor'));
        }
      }
    } else {
      damage = fresh.length * CHIP_DAMAGE;
    }
    const before = state.enemyHp;
    // Chip damage never drops the enemy below 1: only the finished shape defeats it.
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
          state.counts.zaps++;
          events.push(...this.hit(ZAP_DAMAGE, 'zap'));
        }
      }
      if (charge.warmUp === 0 && charge.live === null) {
        charge.live = this.pickLive(blocks);
        if (charge.live !== null) events.push({ kind: 'live', line: charge.live });
      }
    }

    // Turns: every few lines the block turns a quarter.
    if (state.turn) {
      state.turn.meter += fresh.length;
      if (state.turn.meter >= state.turn.every) {
        state.turn.meter = 0;
        events.push({ kind: 'turn' });
      }
    }

    events.push(...this.phases(blocks));
    return events;
  }

  /**
   * Picks up a fight carried over from the other board (a boss that switches dimension):
   * sets the enemy's HP, then starts the phases it has fallen into, picking their powers on
   * this block. Lines already struck here stay struck.
   */
  carry(enemyHp: number, blocks: Uint8Array): BattleEvent[] {
    this.state.enemyHp = Math.max(1, Math.min(this.state.maxHp, Math.round(enemyHp)));
    return this.phases(blocks);
  }

  private phases(blocks: Uint8Array): BattleEvent[] {
    const { state } = this;
    const events: BattleEvent[] = [];
    const phases = this.enemy.phases ?? [];
    while (
      state.phase + 1 < phases.length &&
      state.enemyHp <= phases[state.phase + 1].at * state.maxHp
    ) {
      state.phase++;
      const phase = phases[state.phase];
      events.push({ kind: 'phase', phase, index: state.phase });
      // The wipe first, so new fog and scrambles are checked against the board it leaves.
      if (phase.swap) {
        const swap = this.swap(blocks);
        if (swap) events.push(swap);
      }
      if (phase.fog) state.fog.push(...this.pickMore(phase.fog, blocks, 'fog'));
      if (phase.scramble) state.scramble.push(...this.pickMore(phase.scramble, blocks, 'scramble'));
      if (phase.charge) this.setCharge(phase.charge);
      if (phase.rotate) state.turn = { every: phase.rotate, meter: state.turn?.meter ?? 0 };
      if (phase.ink) {
        for (let n = 0; n < (phase.inkCount ?? 1); n++) {
          const cells = this.splash(phase.ink, blocks);
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
   * Lines for a phase's fog or scrambles: first ones that keep the block solvable from
   * scratch (so undoing your work can't strand you), then, if that runs short, ones that
   * keep it solvable from what's correctly on the board now.
   */
  private pickMore(count: number, blocks: Uint8Array, kind: 'fog' | 'scramble'): number[] {
    const picked = this.pickLines(count, new Uint8Array(blocks.length), kind);
    if (picked.length >= count) return picked;
    this.state[kind].push(...picked);
    const more = this.pickLines(count - picked.length, blocks, kind);
    this.state[kind].splice(this.state[kind].length - picked.length, picked.length);
    return [...picked, ...more];
  }

  /** Ink over a size×size patch of a layer, where you've done the most, outside finished lines. */
  private splash(size: number, blocks: Uint8Array): number[] {
    const { state } = this;
    return this.board(blocks).pickInk(size, new Set(state.ink), new Set(state.struck), this.rng);
  }

  /** The Mimic: two lines with the most of your work in them, wiped back to solid cubes. */
  private swap(blocks: Uint8Array): BattleEvent | null {
    const board = this.board(blocks);
    const swap = board.pickSwap(new Set(this.state.struck));
    if (!swap) return null;
    board.wipe(swap.cells);
    this.state.swapped = swap.lines;
    return { kind: 'swap', lines: this.state.swapped, wiped: swap.cells };
  }

  /** Accuse a suspect line of being forged. */
  callOut(line: number): BattleEvent[] {
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
    const events: BattleEvent[] = [{ kind: 'honest', line }];
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

  /** A bomb: damage, and one line it works out for you (breaks and paints it). */
  bomb(blocks: Uint8Array): { events: BattleEvent[]; cells: number[] } {
    this.state.counts.gadgetsUsed++;
    const before = this.state.enemyHp;
    this.state.enemyHp = Math.max(1, this.state.enemyHp - BOMB_DAMAGE);
    // One open line, worked out for you.
    const board = this.board(blocks);
    const cells = board.blast(new Set(this.state.struck), this.rng);
    board.reveal(cells);
    const events: BattleEvent[] = [
      { kind: 'chip', amount: before - this.state.enemyHp, lines: [] },
    ];
    const washed = this.state.ink.filter((c) => cells.includes(c));
    if (washed.length) {
      this.state.ink = this.state.ink.filter((c) => !washed.includes(c));
      events.push({ kind: 'washed', cells: washed });
    }
    return { events: [...events, ...this.update(blocks)], cells };
  }

  shieldUp(hits: number): void {
    this.state.counts.gadgetsUsed++;
    this.state.shield += hits;
  }

  wash(): BattleEvent[] {
    this.state.counts.gadgetsUsed++;
    const cells = this.state.ink;
    this.state.ink = [];
    return cells.length ? [{ kind: 'washed', cells }] : [];
  }

  /** The solved shape lands: the rest of the enemy's HP. */
  finish(): number {
    const dealt = this.state.enemyHp;
    this.state.enemyHp = 0;
    return dealt;
  }

  /** The powers in this fight, for tip cards. */
  get powers(): string[] {
    const e = this.enemy;
    const phases = e.phases ?? [];
    const has = (key: keyof Phase) => phases.some((p) => p[key]);
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
