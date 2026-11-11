import type { Board } from '@picross/grid/engine/board';
import { noLines, type Line, type LineSet } from '@picross/grid/engine/lines';
import { blastOf, lineAt, lineId, swapOf } from '@picross/grid/game/fightBoard';
import type { Puzzle } from '@picross/grid/puzzles/format';
import type { GridEvent } from '@picross/story/fight/battle';
import type { GadgetEffect } from '@picross/story/puzzles/gadgets';
import type { Blast } from '@picross/grid/engine/blast';
import type { Swap } from '@picross/grid/engine/swap';
import type { BattleState, Enemy, Phase } from './battle';
import { onBattle, type GridBattle, type Plan } from './battleCodec';

/**
 * A 2D fight's rules in one step, with no DOM, sound or timers (#163). The fight screen's
 * hooks (`ui/screens/run/fight/`) tell `gridStep` what just happened on the board, save
 * the state it returns, and show its events in order: they keep only the rendering,
 * sound, haptics and timing.
 *
 * The rules are the story's one battle (`StoryBattle`, #166) with `GRID_RULES`, over the
 * grid's `FightBoard` (`gridFightBoard`, #164): each step decodes the saved battle, plays
 * it, and encodes it back in the 2D save's own shape (`battleCodec.ts`). What's left here
 * is the screen's side: the events in the order it shows them, with what it needs to show
 * them (rows and columns, the sets as they stand). On a grid a fight runs: lift what the
 * lines clear, chip, start phases, the armor's meter, the turn's, then the charge's.
 *
 * Some effects wait (`Later`): a swap or a turn until the stroke ends, ink, zaps and the
 * armor's hits until the redraw is over. The step says when one is due, and the hooks
 * run it at that moment by calling `gridStep` again with the matching input.
 */

/** What started a hit on you: a hit lands on your run HP unless a patch kit blocks it. */
export type HitCause = 'mistake' | 'zap' | 'armor' | 'accusation';

/** What just happened, from the board or the player. */
export type FightInput =
  /**
   * Lines that just became complete, as the board reports them: their shown clue is
   * satisfied, and they weren't a moment ago. A forged line here doesn't count until
   * it's called out. `board` is the board now, which the charge aims from.
   */
  | { kind: 'lines'; lines: readonly Line[]; board?: Board }
  /** A wrong fill was caught (Hits on). */
  | { kind: 'mistake' }
  /** The player accuses `line` of being forged. */
  | { kind: 'call-out'; line: Line; hitsOn: boolean }
  /** A gadget is used (the hooks check it can be first). */
  | { kind: 'gadget'; effect: GadgetEffect }
  /** The debug panel deals damage. */
  | { kind: 'damage'; amount: number }
  /** Make sure a line you can read is live, if the enemy charges. */
  | { kind: 'aim'; board?: Board }
  /** The board turns if it's due. */
  | { kind: 'turn' }
  /** One of the Mimic's swaps lands. */
  | { kind: 'swap'; board: Board }
  /** One phase's ink lands: `count` blocks `size` cells across (default 1). */
  | { kind: 'ink'; size: number; count?: number; board: Board }
  /** The charge's zap lands. */
  | { kind: 'zap'; hitsOn: boolean }
  /** The armor's hit lands. */
  | { kind: 'hit-back'; hitsOn: boolean }
  /** A bomb goes off; `rand` picks where (Math.random by default). */
  | { kind: 'blast'; board: Board; rand?: () => number };

/** A phase started (one event for every phase a step starts at once). */
export interface PhaseEvent {
  kind: 'phase';
  /** Phases started now, counting these. */
  phase: number;
  entered: Phase[];
  /** The enemy's name before and its form after. */
  before: string;
  name: string;
  sprite: string;
  taunt: string;
  fog?: LineSet;
  scramble?: LineSet;
  /** Lines the phases just fogged and scrambled. */
  fogged: number;
  scrambled: number;
}

/** The charge meter as it stands, after the charge aims. */
export interface ChargeEvent {
  kind: 'charge';
  /** Lines to a zap, or null when the enemy doesn't charge (the meter hides). */
  limit: number | null;
  /** Lines left in the warm-up; while any are, no line is live. */
  warmUp: number;
  charged: number;
  live: Line | null;
  /** The line that just went live, if it changed. */
  fresh: Line | null;
  /** Whether the warm-up was still running before these lines (a step's only). */
  warming: boolean;
}

export type HitEvent =
  { kind: 'hit'; amount: number; cause: HitCause } | { kind: 'blocked'; cause: HitCause };

/**
 * An effect that waits. Each runs as `gridStep` with the input of the same kind, at its
 * moment: `swap` and `turn` once no stroke is in progress, the rest once the current
 * redraw is over. In order, as they come:
 * - `aim` and `sync-turn` follow every phase, which may start the charge, fog the live
 *   line, or start or change the turn's count. `sync-turn` shows the count, then waits
 *   for a `turn`.
 * - `blast` follows a bomb, after anything its phase queued, so a phase can't undo it.
 */
export type Later =
  | { kind: 'later'; do: 'aim' | 'sync-turn' | 'turn' | 'zap' | 'hit-back' | 'blast' }
  | { kind: 'later'; do: 'swap'; count: number }
  | { kind: 'later'; do: 'ink'; splashes: { size: number; count?: number }[] };

export type FightEvent =
  | PhaseEvent
  | ChargeEvent
  | HitEvent
  | Later
  // Lines: what they clear, in this order, then exactly one `chip`, then the meters.
  /** Weak points cracked (#50); `armor` is what's left. */
  | { kind: 'cracked'; armor: LineSet; lines: Line[]; broke: boolean }
  | { kind: 'fog-lifted'; fog: LineSet; lines: Line[] }
  /** Lines the Mimic wiped, filled in again. */
  | { kind: 'refilled'; wiped: LineSet; lines: Line[] }
  /** Suspects solved, so they were honest. */
  | { kind: 'honest'; suspects: LineSet; lines: Line[] }
  | { kind: 'washed'; ink: number[]; cells: number[] }
  | { kind: 'unscrambled'; scramble: LineSet; lines: Line[] }
  /**
   * The lines' damage. Every `lines` step has one, after what the lines cleared and
   * before the meters: the hooks save the battle here, as the screen always has.
   */
  | {
      kind: 'chip';
      dealt: number;
      hp: number;
      /** Lines that counted (not forged). */
      lines: number;
      cracked: number;
      broke: boolean;
      armored: boolean;
    }
  | { kind: 'armor-meter'; lines: number; hits: number; armored: boolean }
  | { kind: 'turn-meter'; turning: number; limit: number }
  | { kind: 'grounded' }
  // Call-outs (#64).
  | { kind: 'not-suspect'; line: Line }
  | { kind: 'caught'; line: Line; dealt: number; hp: number }
  /** An honest suspect accused with Hits on: a hit follows. */
  | { kind: 'accused'; line: Line }
  /** An honest suspect accused in a Relaxed run: the enemy heals. */
  | { kind: 'healed'; line: Line; amount: number; hp: number }
  // Gadgets and the debug panel. `washed` is the ink a sponge took.
  | { kind: 'gadget'; effect: GadgetEffect['kind']; dealt: number; hp: number; washed: number[] }
  | { kind: 'damaged'; dealt: number; hp: number }
  // What waited, when it lands. After `swapped` and `blasted` (and a call-out, zap or
  // hit) the hooks refresh the board, which may report more lines. After `turned` they
  // turn the board (`turnedPuzzle`), then aim the charge again.
  | { kind: 'zapped' }
  | { kind: 'fizzled'; cause: 'zap' | 'armor' }
  | { kind: 'turned'; turns: number }
  | { kind: 'swapped'; swap: Swap; wiped: LineSet }
  | { kind: 'inked'; ink: number[]; added: number }
  | { kind: 'blasted'; blast: Blast; washed: number[] };

export interface FightStep {
  state: BattleState;
  events: FightEvent[];
}

type StoryEvent = GridEvent;
type Key = NonNullable<Plan['order']>[number];
type Of<K extends StoryEvent['kind']> = Extract<StoryEvent, { kind: K }>;
const find = <K extends StoryEvent['kind']>(events: StoryEvent[], kind: K) =>
  events.find((e): e is Of<K> => e.kind === kind);
const all = <K extends StoryEvent['kind']>(events: StoryEvent[], kind: K) =>
  events.filter((e): e is Of<K> => e.kind === kind);

/**
 * The fields a step that may start phases writes, in the order the 2D game wrote them: the
 * phase count, then each phase's fog and scrambles (written even if their pools were all
 * taken).
 */
function phaseKeys(enemy: Enemy, events: StoryEvent[]): Plan {
  const keys: Key[] = ['phase'];
  for (const e of all(events, 'phase')) {
    const phase = enemy.phases![e.index];
    if (phase.fog) keys.push('fog');
    if (phase.scramble) keys.push('scramble');
  }
  return { order: keys, touch: keys.slice(1) };
}

/** Plans one after the other: `a`'s fields first. */
const then = (a: Plan, b: Plan): Plan => ({
  order: [...(a.order ?? []), ...(b.order ?? [])],
  touch: [...(a.touch ?? []), ...(b.touch ?? [])],
});

/**
 * The phases a step started (#42), as one event with what each one queues: the charge
 * aims and the turn's count shows after every phase, then its swaps and ink.
 */
function phaseEvents(
  enemy: Enemy,
  battle: GridBattle,
  story: StoryEvent[],
  before: string,
  next: BattleState,
): FightEvent[] {
  const started = all(story, 'phase');
  if (!started.length) return [];
  const entered: Phase[] = started.map((e) => enemy.phases![e.index]);
  const { name, sprite } = battle.current;
  const swaps = all(story, 'due').filter((e) => e.power === 'swap').length;
  // Ink lands after the new state is saved, so it isn't lost to the save.
  const splashes = all(story, 'due').flatMap((e) =>
    e.power === 'ink' ? [{ size: e.size, count: e.count }] : [],
  );
  return [
    {
      kind: 'phase',
      phase: next.phase ?? 0,
      entered,
      before,
      name,
      sprite,
      taunt: entered
        .map((p) => p.taunt)
        .filter(Boolean)
        .join(' '),
      fog: next.fog,
      scramble: next.scramble,
      fogged: started.reduce((n, e) => n + (e.fogged?.length ?? 0), 0),
      scrambled: started.reduce((n, e) => n + (e.scrambled?.length ?? 0), 0),
    },
    { kind: 'later', do: 'aim' },
    { kind: 'later', do: 'sync-turn' },
    ...(swaps ? [{ kind: 'later', do: 'swap', count: swaps } as const] : []),
    ...(splashes.length ? [{ kind: 'later', do: 'ink', splashes } as const] : []),
  ];
}

/** The charge meter as the battle aimed it, for the screen. */
function chargeEvent(height: number, e: Of<'charge'>, warming: boolean): ChargeEvent {
  const live = e.live === null ? null : lineAt(height, e.live);
  return {
    kind: 'charge',
    limit: e.every,
    warmUp: e.warmUp,
    charged: e.meter,
    live,
    fresh: e.picked ? live : null,
    warming,
  };
}

/** Hits on you, as the battle landed them. */
const hits = (story: StoryEvent[]): HitEvent[] =>
  story.filter((e): e is HitEvent => e.kind === 'hit' || e.kind === 'blocked');

/** A step on the battle: what it played, the battle after, and the save it encodes to. */
function play<R>(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  run: (battle: GridBattle) => R,
  plan: Plan | ((result: R, battle: GridBattle) => Plan) = {},
  hitsOn = true,
) {
  let battle!: GridBattle;
  let before = '';
  const { state: next, result } = onBattle(
    enemy,
    state,
    { puzzle, hitsOn },
    (b) => {
      battle = b;
      before = b.current.name;
      return run(b);
    },
    plan,
  );
  return { next, result, battle, before };
}

const zapDue = (story: StoryEvent[]) => story.some((e) => e.kind === 'due' && e.power === 'zap');

/** Lines finished on the board: everything they do, in the order the screen shows it. */
function finishLines(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  reported: readonly Line[],
  board: Board | undefined,
): FightStep {
  const h = puzzle.height;
  // Whether the warm-up was still running before these lines.
  const warming = Boolean(state.warmUp);
  const {
    next,
    result: story,
    battle,
    before,
  } = play(
    enemy,
    puzzle,
    state,
    (b) =>
      b.finished(
        reported.map((l) => lineId(h, l)),
        board,
      ),
    (story, b) => {
      const touch: Key[] = [];
      if (find(story, 'armor-meter')?.others && b.state.targets.length) touch.push('armorLines');
      if (find(story, 'grounded') || zapDue(story)) touch.push('charged', 'live');
      if (find(story, 'charge')?.picked) touch.push('live');
      return then(phaseKeys(enemy, story), {
        order: ['armorLines', 'turning', 'warmUp', 'charged', 'live'],
        touch,
      });
    },
  );
  const lines = (power: Of<'cleared'>['power']) =>
    all(story, 'cleared')
      .find((e) => e.power === power)
      ?.lines.map((id) => lineAt(h, id)) ?? [];
  const events: FightEvent[] = [];

  // Weak points crack (#50); the phases the damage starts (#42); then fog lifts (#30), wipe
  // marks go (#78), solved suspects were honest (#64), ink washes off (#67) and scrambles
  // restore (#49); then one chip.
  const cracked = find(story, 'cracked');
  if (cracked) {
    events.push({
      kind: 'cracked',
      armor: next.armor ?? noLines(),
      lines: cracked.lines.map((id) => lineAt(h, id)),
      broke: cracked.broke,
    });
  }
  events.push(...phaseEvents(enemy, battle, story, before, next));
  const fog = lines('fog');
  if (fog.length && next.fog) events.push({ kind: 'fog-lifted', fog: next.fog, lines: fog });
  const refilled = lines('swapped');
  if (refilled.length) {
    events.push({ kind: 'refilled', wiped: next.wiped ?? noLines(), lines: refilled });
  }
  const honest = lines('suspects');
  if (honest.length) {
    events.push({ kind: 'honest', suspects: next.suspects ?? noLines(), lines: honest });
  }
  const washed = find(story, 'washed');
  if (washed) events.push({ kind: 'washed', ink: next.ink ?? [], cells: washed.cells });
  const unscrambled = lines('scramble');
  if (unscrambled.length && next.scramble) {
    events.push({ kind: 'unscrambled', scramble: next.scramble, lines: unscrambled });
  }
  const chip = find(story, 'chip')!;
  const { armored } = battle.current;
  events.push({
    kind: 'chip',
    dealt: chip.amount,
    hp: next.enemyHp,
    lines: chip.lines.length,
    cracked: cracked?.lines.length ?? 0,
    broke: cracked?.broke ?? false,
    armored,
  });

  // The armor's meter (#116): other lines it shrugs off move it toward a hit back.
  const meter = find(story, 'armor-meter');
  if (meter) {
    events.push({ kind: 'armor-meter', lines: next.armorLines ?? 0, hits: meter.hits, armored });
    for (let n = 0; n < meter.hits; n++) events.push({ kind: 'later', do: 'hit-back' });
  }
  // The turn's meter (#83).
  const turning = find(story, 'turn-meter');
  if (turning) {
    events.push({ kind: 'turn-meter', turning: next.turning ?? 0, limit: turning.every });
    events.push({ kind: 'later', do: 'turn' });
  }
  // The charge (#67): the live line grounds it, others charge it toward a zap.
  if (find(story, 'grounded')) events.push({ kind: 'grounded' });
  if (zapDue(story)) events.push({ kind: 'later', do: 'zap' });
  const aimed = find(story, 'charge');
  if (aimed) events.push(chargeEvent(h, aimed, warming));
  return { state: next, events };
}

/** Accusing a 🎭 suspect (#64): a forgery is unmasked, an honest one costs you. */
function accuse(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  line: Line,
  hitsOn: boolean,
): FightStep {
  const {
    next,
    result: story,
    battle,
    before,
  } = play(
    enemy,
    puzzle,
    state,
    (b) => b.accuse(lineId(puzzle.height, line)),
    (story) =>
      then(
        { order: ['fakes', 'suspects', 'counts', 'shield', 'enemyHp'] },
        phaseKeys(enemy, story),
      ),
    hitsOn,
  );
  // Only 🎭 clues can be forged: tapping any other just says so.
  if (!story.length) return { state, events: [{ kind: 'not-suspect', line }] };
  const caught = find(story, 'caught');
  if (caught) {
    const events = phaseEvents(enemy, battle, story, before, next);
    events.push({ kind: 'caught', line, dealt: caught.amount, hp: next.enemyHp });
    return { state: next, events };
  }
  if (hitsOn) return { state: next, events: [{ kind: 'accused', line }, ...hits(story)] };
  const healed = find(story, 'healed')!;
  return {
    state: next,
    events: [{ kind: 'healed', line, amount: healed.amount, hp: next.enemyHp }],
  };
}

/** A gadget (#28), counted for the run's tally (#107): bombs rule out gold, sponges a badge. */
function gadget(enemy: Enemy, puzzle: Puzzle, state: BattleState, effect: GadgetEffect) {
  const {
    next,
    result: story,
    battle,
    before,
  } = play(
    enemy,
    puzzle,
    state,
    (b) => b.use(effect),
    (story) =>
      then(
        {
          order: ['counts', 'shield', 'ink', 'enemyHp'],
          touch: effect.kind === 'wash' ? ['ink'] : [],
        },
        phaseKeys(enemy, story),
      ),
  );
  const events = phaseEvents(enemy, battle, story, before, next);
  events.push({
    kind: 'gadget',
    effect: effect.kind,
    dealt: find(story, 'chip')?.amount ?? 0,
    hp: next.enemyHp,
    washed: effect.kind === 'wash' ? (find(story, 'washed')?.cells ?? []) : [],
  });
  if (effect.kind === 'blast') events.push({ kind: 'later', do: 'blast' });
  return { state: next, events };
}

/**
 * One step of a 2D fight: the battle after `input`, and what happened, in the order the
 * screen shows it. `puzzle` is the board as it stands, turned if it has turned (#83).
 * Pure: the same input gives the same step (a bomb's `rand` aside).
 */
export function gridStep(
  enemy: Enemy,
  puzzle: Puzzle,
  state: BattleState,
  input: FightInput,
): FightStep {
  const h = puzzle.height;
  const step = <R>(
    run: (battle: GridBattle) => R,
    plan: Plan | ((result: R, battle: GridBattle) => Plan) = {},
    hitsOn = true,
  ) => play(enemy, puzzle, state, run, plan, hitsOn);
  switch (input.kind) {
    case 'lines':
      return finishLines(enemy, puzzle, state, input.lines, input.board);
    case 'mistake': {
      const { next, result } = step((b) => b.mistake(), { order: ['counts', 'shield'] });
      return { state: next, events: hits(result) };
    }
    case 'call-out':
      return accuse(enemy, puzzle, state, input.line, input.hitsOn);
    case 'gadget':
      return gadget(enemy, puzzle, state, input.effect);
    case 'damage': {
      const { next, result, battle, before } = step(
        (b) => b.damage(input.amount),
        (story) => then({ order: ['enemyHp'] }, phaseKeys(enemy, story)),
      );
      const events = phaseEvents(enemy, battle, result, before, next);
      events.push({ kind: 'damaged', dealt: find(result, 'chip')!.amount, hp: next.enemyHp });
      return { state: next, events };
    }
    case 'aim': {
      const { next, result } = step(
        (b) => b.aim(input.board),
        (story) => ({
          order: ['warmUp', 'live'],
          touch: find(story, 'charge')?.picked ? ['live'] : [],
        }),
      );
      return { state: next, events: [chargeEvent(h, find(result, 'charge')!, false)] };
    }
    case 'turn': {
      const { next, result } = step((b) => b.landTurn(), {
        order: ['struck', 'turns', 'turning'],
        touch: ['turns', 'turning'],
      });
      if (!result.length) return { state, events: [] };
      return { state: next, events: [{ kind: 'turned', turns: next.turns ?? 0 }] };
    }
    case 'swap': {
      const { next, result } = step((b) => b.landSwap(input.board), { order: ['wiped'] });
      const swapped = find(result, 'swap');
      if (!swapped) return { state, events: [] };
      const swap: Swap = swapOf(h, { lines: swapped.lines, cells: swapped.wiped });
      // Saved before the board is wiped, so lines it re-opens don't count as new.
      return { state: next, events: [{ kind: 'swapped', swap, wiped: next.wiped! }] };
    }
    case 'ink': {
      const { next, result } = step((b) => b.landInk(input.board, input.size, input.count), {
        order: ['ink'],
      });
      const added = all(result, 'ink').reduce((n, e) => n + e.cells.length, 0);
      if (!added) return { state, events: [] };
      return { state: next, events: [{ kind: 'inked', ink: next.ink!, added }] };
    }
    case 'zap': {
      const { next, result } = step(
        (b) => b.landZap(),
        { order: ['counts', 'shield'] },
        input.hitsOn,
      );
      if (!input.hitsOn)
        return { state, events: [{ kind: 'zapped' }, { kind: 'fizzled', cause: 'zap' }] };
      return { state: next, events: [{ kind: 'zapped' }, ...hits(result)] };
    }
    case 'hit-back': {
      if (!input.hitsOn) return { state, events: [{ kind: 'fizzled', cause: 'armor' }] };
      const { next, result } = step((b) => b.landHitBack(), { order: ['shield'] });
      return { state: next, events: hits(result) };
    }
    case 'blast': {
      const rand = input.rand ?? Math.random;
      const { next, result } = step((b) => b.landBlast(input.board, rand), { order: ['ink'] });
      if (!result.cells.length) return { state, events: [] };
      const blast: Blast = blastOf(puzzle.width, result.cells);
      // The blast washes the ink out of the cells it hits (#115).
      const washed = find(result.events, 'washed')?.cells ?? [];
      return { state: next, events: [{ kind: 'blasted', blast, washed }] };
    }
  }
}
