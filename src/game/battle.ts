import type { Clue } from '../engine/clues';
import { random, shuffled } from '../engine/random';
import { EMPTY, FILLED, solve } from '../engine/solver';
import { indexOf, inside, pointOf, type Line } from '../engine/volume';
import type { Puzzle } from '../puzzles/format';
import type { Enemy, Phase } from '../story/data';
import { BROKEN, PAINTED, SOLID } from './game';

/**
 * A story fight on a block: the 2D game's battle rules (src/game/battle.ts there), with
 * lines along three axes. Finishing a line (every cube that isn't the shape broken, none
 * that is) chips the enemy; the solved shape is the finishing blow. Enemies fight back
 * with powers, all measured in lines finished, never in time. Each power picks its lines
 * when it lands, checking the block can still be solved from what's on it.
 */

export const CHIP_DAMAGE = 1;
export const TARGET_DAMAGE = 3;
export const ARMOR_HIT_LINES = 5;
export const ARMOR_HIT_DAMAGE = 2;
export const CALL_OUT_DAMAGE = 5;
export const FALSE_ACCUSATION_HEAL = 3;
export const ZAP_DAMAGE = 2;
export const BOMB_DAMAGE = 2;
/** Share of a block's lines finished before a charge first goes live. */
export const WARM_UP_SHARE = 0.15;

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

/**
 * Lines of a block that are finished: every cube that isn't the shape broken, none that
 * is. A line that's all shape has nothing to break, so it's finished once it's all painted.
 */
export function finishedLines(puzzle: Puzzle, blocks: Uint8Array): number[] {
  return puzzle.lines
    .filter((line) => {
      const full = line.cells.every((c) => puzzle.solution[c]);
      return line.cells.every((c) =>
        puzzle.solution[c]
          ? full
            ? blocks[c] === PAINTED
            : blocks[c] !== BROKEN
          : blocks[c] === BROKEN,
      );
    })
    .map((l) => l.id);
}

/** What the player has right on the board, as solver knowledge. */
function knownFrom(puzzle: Puzzle, blocks: Uint8Array): Uint8Array {
  const known = new Uint8Array(blocks.length);
  blocks.forEach((b, i) => {
    if (b === BROKEN && !puzzle.solution[i]) known[i] = EMPTY;
    else if (b === PAINTED && puzzle.solution[i]) known[i] = FILLED;
  });
  return known;
}

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

  /** Clues as the solver should treat them now: suspects can't be trusted. */
  /** The clues a player can trust right now (for hints): no fog, no suspects. */
  hintClues(): (Clue | null)[] {
    const finished = new Set(this.state.struck);
    return this.trustedClues().map((c, i) => (finished.has(i) ? this.base[i] : c));
  }

  private trustedClues(extra: { fog?: number[]; scramble?: number[]; suspects?: number[] } = {}) {
    const fog = new Set([...this.state.fog, ...(extra.fog ?? [])]);
    const scramble = new Set([...this.state.scramble, ...(extra.scramble ?? [])]);
    const suspects = new Set([...this.state.suspects, ...(extra.suspects ?? [])]);
    return this.base.map((clue, i) => {
      if (!clue || suspects.has(i) || fog.has(i)) return null;
      if (scramble.has(i)) return { count: clue.count, pieces: null };
      return clue;
    });
  }

  private solvable(blocks: Uint8Array, extra: Parameters<Battle['trustedClues']>[0]): boolean {
    const { puzzle } = this;
    return solve(puzzle.dims, this.trustedClues(extra), knownFrom(puzzle, blocks), puzzle.lines)
      .solved;
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
    for (const id of this.candidates()) {
      if (picked.length >= count) break;
      const clue = this.base[id]!;
      // A count of 0 or 1, or a full line, has only one possible frame: nothing to scramble.
      if (
        kind === 'scramble' &&
        (clue.count < 2 || clue.count === this.puzzle.lines[id].cells.length)
      ) {
        continue;
      }
      if (this.solvable(blocks, { [kind]: [...picked, id] })) picked.push(id);
    }
    return picked;
  }

  private pickTargets(count: number): number[] {
    // Targets are lines with cubes of the shape in them, so finishing one takes work.
    return this.candidates()
      .filter((id) => this.base[id]!.count > 0)
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
    const truth = this.base[line]!;
    const n = this.puzzle.lines[line].cells.length;
    const options: Clue[] = [];
    for (const count of [truth.count + 1, truth.count - 1]) {
      if (count < 0 || count > n) continue;
      // The most pieces `count` cubes can make in a line of n.
      const most = Math.min(3, count, n - count + 1);
      const pieces = count === 0 ? 0 : Math.max(1, Math.min(truth.pieces ?? 1, most));
      options.push({ count, pieces: pieces as Clue['pieces'] });
    }
    return options[Math.floor(this.rng() * options.length)];
  }

  private setCharge(every: number): void {
    const warmUp =
      this.state.charge?.warmUp ??
      Math.max(1, Math.round(this.puzzle.lines.length * WARM_UP_SHARE));
    this.state.charge = { every, meter: 0, live: this.state.charge?.live ?? null, warmUp };
  }

  /** A new live line for the charge: one with work left in it. */
  private pickLive(blocks: Uint8Array): number | null {
    const finished = new Set(finishedLines(this.puzzle, blocks));
    const open = this.puzzle.lines.filter(
      (l) => !finished.has(l.id) && l.cells.some((c) => blocks[c] === SOLID),
    );
    if (!open.length) return null;
    return open[Math.floor(this.rng() * open.length)].id;
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
    const finished = finishedLines(this.puzzle, blocks);
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
          events.push(...this.hit(ARMOR_HIT_DAMAGE, 'armor'));
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
      if (phase.fog) state.fog.push(...this.pickLines(phase.fog, blocks, 'fog'));
      if (phase.scramble)
        state.scramble.push(...this.pickLines(phase.scramble, blocks, 'scramble'));
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
      if (phase.swap) {
        const swap = this.swap(blocks);
        if (swap) events.push(swap);
      }
    }
    return events;
  }

  /** Ink over a size×size patch of a layer, where you've done the most, outside finished lines. */
  private splash(size: number, blocks: Uint8Array): number[] {
    const { dims } = this.puzzle;
    const finished = new Set(this.state.struck.flatMap((id) => this.puzzle.lines[id].cells));
    const marked = [...blocks.keys()].filter(
      (i) => blocks[i] !== BROKEN && !finished.has(i) && !this.state.ink.includes(i),
    );
    if (!marked.length) return [];
    // Around a cube you've painted if there is one, else any cube still standing.
    const painted = marked.filter((i) => blocks[i] === PAINTED);
    const pool = painted.length ? painted : marked;
    const center = pointOf(dims, pool[Math.floor(this.rng() * pool.length)]);
    const half = Math.floor(size / 2);
    const cells: number[] = [];
    for (let dz = -half; dz < size - half; dz++) {
      for (let dx = -half; dx < size - half; dx++) {
        const p = { x: center.x + dx, y: center.y, z: center.z + dz };
        if (!inside(dims, p)) continue;
        const i = indexOf(dims, p);
        if (blocks[i] !== BROKEN && !finished.has(i) && !this.state.ink.includes(i)) cells.push(i);
      }
    }
    return cells;
  }

  /** The Mimic: two lines with the most of your work in them, wiped back to solid cubes. */
  private swap(blocks: Uint8Array): BattleEvent | null {
    const finished = new Set(this.state.struck);
    const work = (l: Line) => l.cells.filter((c) => blocks[c] !== SOLID).length;
    const lines = this.puzzle.lines
      .filter((l) => !finished.has(l.id) && work(l) > 0)
      .sort((a, b) => work(b) - work(a) || a.id - b.id)
      .slice(0, 2);
    if (!lines.length) return null;
    const wiped: number[] = [];
    for (const l of lines) {
      for (const c of l.cells) {
        if (blocks[c] !== SOLID) {
          blocks[c] = SOLID;
          wiped.push(c);
        }
      }
    }
    this.state.swapped = lines.map((l) => l.id);
    return { kind: 'swap', lines: this.state.swapped, wiped };
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
    const finished = new Set(this.state.struck);
    const open = this.puzzle.lines.filter(
      (l) => !finished.has(l.id) && l.cells.some((c) => blocks[c] === SOLID),
    );
    const line = open.length ? open[Math.floor(this.rng() * open.length)] : null;
    const cells: number[] = [];
    if (line) {
      for (const c of line.cells) {
        const to = this.puzzle.solution[c] ? PAINTED : BROKEN;
        if (blocks[c] !== to) {
          blocks[c] = to;
          cells.push(c);
        }
      }
    }
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
