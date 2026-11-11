import { describe, expect, it } from 'vitest';
import { random } from '@picross/shared/engine/random';
import { blockFightBoard } from '@picross/block/game/fightBoard';
import { BROKEN, PAINTED, SOLID } from '@picross/block/game/game';
import type { Clue } from '@picross/block/engine/clues';
import { pointOf } from '@picross/block/engine/volume';
import {
  parsePuzzle as parseBlock,
  type Puzzle as BlockPuzzle,
} from '@picross/block/puzzles/format';
import { Cell, createBoard, type Board } from '@picross/grid/engine/board';
import { gridFightBoard, gridTurn } from '@picross/grid/game/fightBoard';
import { parsePuzzle as parseGrid, type Puzzle as GridPuzzle } from '@picross/grid/puzzles/format';
import {
  ARMOR_HIT_DAMAGE,
  ARMOR_HIT_LINES,
  BOMB_DAMAGE,
  CALL_OUT_DAMAGE,
  CHIP_DAMAGE,
  FALSE_ACCUSATION_HEAL,
  StoryBattle,
  TARGET_DAMAGE,
  ZAP_DAMAGE,
  type BattleBoard,
  type FightEnemy,
  type FightState,
  type GridEvent,
} from '@picross/story/fight/battle';
import type { BoardKind, FightBoard } from '@picross/story/fight/board';
import { BLOCK_RULES, GRID_RULES, type FightRules } from '@picross/story/fight/rules';
import { POWER_TIPS } from '@picross/story/fight/tips';
import { getGadget } from '@picross/story/puzzles/gadgets';
import { boardAt, carryHp, turnedPuzzle } from './battle';

/**
 * Every power on both boards (#167): each one runs on a small grid and a small block
 * through the one battle (`StoryBattle`), each board with its own rules (`GRID_RULES`,
 * `BLOCK_RULES`), and does what it should. One test per power and board.
 *
 * The enemies are the same on both boards, every power a count of lines, so the battle
 * picks them on each board at runtime (checking the board stays solvable) and nothing is
 * written for one board only. (The 2D story names its lines instead, in pools proven
 * offline; `packages/story/src/fight/battle.test.ts` covers pools.) What differs between
 * the boards is what each rule says, and each test says which way it goes.
 *
 * Each board plays as its game does: a grid reports the lines whose clues just became
 * satisfied (`finished`) and lands what waits (`landSwap`, `landInk`, …) once the stroke
 * is over, as the 2D fight screen does; a block polls its lines (`update`), and its swaps,
 * ink and zaps land at once. A stroke here puts the truth in some cells.
 */

/** A small grid, 5×5: every line has some of the picture, so none is finished blank. */
const GRID = parseGrid({
  id: 'parity',
  name: 'Parity',
  width: 5,
  height: 5,
  solution: ['##.##', '#..#.', '####.', '.#.##', '##.#.'],
});

/** A small block, 3×3×3 (27 lines). */
const BLOCK = parseBlock({
  id: 'parity',
  name: 'Parity',
  colors: { a: 'red' },
  layers: [
    ['aaa', 'a.a', 'aa.'],
    ['a..', '.a.', 'a.a'],
    ['.aa', 'aa.', '.a.'],
  ],
});

type Event = GridEvent;
type Battle = StoryBattle<unknown, unknown>;

/** A fight on one board, as its game plays it. */
interface Fight {
  readonly kind: BoardKind;
  readonly rules: Readonly<FightRules>;
  /** The battle now (a grid's is rebuilt on the turned board after a turn, as the 2D game's is). */
  readonly battle: Battle;
  readonly state: FightState<unknown>;
  /** The board as it stands. */
  view(): FightBoard<unknown>;
  /** One stroke: these cells to the truth, then what the board reports and what waits. */
  play(cells: readonly number[]): Event[];
  /** Finishes these lines in one stroke. */
  finish(...lines: number[]): Event[];
  /** The lines that would be finished after these cells were played (nothing changes). */
  finishedIf(cells: readonly number[]): number[];
  /** Whether a cell has the truth in it, and whether it's blank (nothing played). */
  right(cell: number): boolean;
  blank(cell: number): boolean;
  mistake(): Event[];
  callOut(line: number): Event[];
  bomb(): { events: Event[]; cells: number[] };
  sponge(): Event[];
}

interface Side {
  kind: BoardKind;
  rules: Readonly<FightRules>;
  /** Lines on the board, as the enemy's HP scales by. */
  lines: number;
  start(enemy: FightEnemy, opts?: { hitsOn?: boolean; seed?: number; maxHp?: number }): Fight;
}

/** The grid as the 2D game's battle asks for it (`gridBoard` in the codec). */
const gridBattleBoard = (puzzle: GridPuzzle): BattleBoard<number[], Board> => ({
  at: (board) => gridFightBoard(puzzle, board && { board }),
  scrambled: (clue) => clue,
});

/** The block as Cubed's battle asks for it (`Battle`'s, every clue showing). */
const blockBattleBoard = (puzzle: BlockPuzzle): BattleBoard<Clue, Uint8Array> => ({
  at: (blocks) => blockFightBoard(puzzle, blocks && { blocks }),
  scrambled: (clue) => ({ count: clue.count, pieces: null }),
});

const due = (events: Event[]) => events.filter((e) => e.kind === 'due');

const GRID_SIDE: Side = {
  kind: 'flat',
  rules: GRID_RULES,
  lines: GRID.width + GRID.height,
  start(enemy, { hitsOn = true, seed = 3, maxHp } = {}) {
    let puzzle = GRID;
    let board = createBoard(puzzle.width, puzzle.height);
    let battle = new StoryBattle(enemy, GRID_RULES, gridBattleBoard(puzzle), hitsOn, undefined, {
      seed,
      maxHp,
    });
    const view = () => gridFightBoard(puzzle, { board });
    const blastRng = random(seed);

    /** What waits lands, in order, as the fight screen lands it. */
    const land = (events: Event[]): Event[] => {
      const out: Event[] = [];
      for (const e of due(events)) {
        if (e.kind !== 'due') continue;
        if (e.power === 'swap') {
          const swap = battle.landSwap(board);
          for (const s of swap) if (s.kind === 'swap') view().wipe(s.wiped);
          out.push(...swap);
        } else if (e.power === 'turn') {
          const turned = battle.landTurn();
          if (turned.length) {
            // The screen turns the board and its puzzle, then the battle plays on them.
            const turn = gridTurn(puzzle.width);
            const cells = new Array<Cell>(board.cells.length);
            board.cells.forEach((c, i) => (cells[turn.cell(i)] = c));
            board = { ...board, cells };
            puzzle = turnedPuzzle(GRID, battle.state.turn?.turns ?? 0);
            battle = new StoryBattle(
              enemy,
              GRID_RULES,
              gridBattleBoard(puzzle),
              hitsOn,
              battle.state,
            );
            out.push(...turned, ...battle.aim(board));
          }
        } else if (e.power === 'ink') out.push(...battle.landInk(board, e.size, e.count));
        else if (e.power === 'zap') out.push(...battle.landZap());
        else if (e.power === 'armor') out.push(...battle.landHitBack());
      }
      return out;
    };
    /** The board reports what just finished. */
    const report = (before: Set<number>): Event[] => {
      const reported = view()
        .finishedLines()
        .filter((id) => !before.has(id));
      if (!reported.length) return [];
      const events = battle.finished(reported, board);
      return [...events, ...land(events)];
    };
    const play = (cells: readonly number[]) => {
      const before = new Set(view().finishedLines());
      view().reveal(cells);
      return report(before);
    };
    // The charge shows as the fight starts.
    if (enemy.charge) battle.aim(board);

    return {
      kind: 'flat',
      rules: GRID_RULES,
      get battle() {
        return battle as Battle;
      },
      get state() {
        return battle.state as FightState<unknown>;
      },
      view,
      play,
      finish: (...lines) => play(lines.flatMap((id) => view().lines[id].cells)),
      finishedIf(cells) {
        const copy = { ...board, cells: [...board.cells] };
        const b = gridFightBoard(puzzle, { board: copy });
        b.reveal(cells);
        return b.finishedLines();
      },
      right: (c) => board.cells[c] === (puzzle.solution.cells[c] ? Cell.Filled : Cell.Marked),
      blank: (c) => board.cells[c] === Cell.Empty,
      mistake: () => battle.mistake(),
      callOut: (line) => {
        const before = new Set(view().finishedLines());
        return [...battle.accuse(line), ...report(before)];
      },
      bomb() {
        const effect = getGadget('bomb')!.effect;
        const events = battle.use(effect);
        expect(due(events)).toEqual([{ kind: 'due', power: 'blast' }]);
        const before = new Set(view().finishedLines());
        const blast = battle.landBlast(board, blastRng);
        view().reveal(blast.cells);
        return { events: [...events, ...blast.events, ...report(before)], cells: blast.cells };
      },
      sponge: () => battle.use(getGadget('sponge')!.effect),
    };
  },
};

const BLOCK_SIDE: Side = {
  kind: 'block',
  rules: BLOCK_RULES,
  lines: BLOCK.lines.length,
  start(enemy, { hitsOn = true, seed = 3, maxHp } = {}) {
    const blocks = new Uint8Array(BLOCK.solution.length);
    const battle = new StoryBattle(enemy, BLOCK_RULES, blockBattleBoard(BLOCK), hitsOn, undefined, {
      seed,
      maxHp,
      marks: blocks,
    });
    const view = () => blockFightBoard(BLOCK, { blocks });
    const truth = (c: number) => (BLOCK.solution[c] ? PAINTED : BROKEN);
    const play = (cells: readonly number[]) => {
      view().reveal(cells);
      return battle.update(blocks);
    };
    return {
      kind: 'block',
      rules: BLOCK_RULES,
      battle: battle as Battle,
      state: battle.state as FightState<unknown>,
      view,
      play,
      finish: (...lines) => play(lines.flatMap((id) => view().lines[id].cells)),
      finishedIf(cells) {
        const b = blockFightBoard(BLOCK, { blocks: blocks.slice() });
        b.reveal(cells);
        return b.finishedLines();
      },
      right: (c) => blocks[c] === truth(c),
      blank: (c) => blocks[c] === SOLID,
      mistake: () => battle.mistake(),
      callOut: (line) => battle.callOut(line),
      bomb: () => battle.bomb(blocks),
      sponge: () => battle.wash(),
    };
  },
};

const SIDES = [GRID_SIDE, BLOCK_SIDE];

const enemy = (extra: Partial<FightEnemy> = {}): FightEnemy => ({
  name: 'Test',
  sprite: 'goblin',
  hp: 200,
  attack: 2,
  ...extra,
});

const of = <K extends Event['kind']>(events: Event[], kind: K) =>
  events.filter((e): e is Extract<Event, { kind: K }> => e.kind === kind);
const hitsOf = (events: Event[], cause: string) =>
  of(events, 'hit').filter((e) => e.cause === cause);
const dealt = (events: Event[]) => of(events, 'chip').reduce((n, e) => n + e.amount, 0);

/**
 * Open lines (not struck, not in `keep`) whose finishing finishes none of `keep`: the ones
 * that finish the fewest other lines with them first, then by id.
 */
function safeLines(fight: Fight, keep: readonly number[]): number[] {
  const { struck } = fight.state;
  const now = fight.view().finishedLines().length;
  return fight
    .view()
    .lines.filter((l) => !struck.includes(l.id) && !keep.includes(l.id))
    .map((l) => ({ id: l.id, after: fight.finishedIf(l.cells) }))
    .filter(({ after }) => keep.every((k) => !after.includes(k)))
    .sort((a, b) => a.after.length - now - (b.after.length - now) || a.id - b.id)
    .map(({ id }) => id);
}

/** Finishes one line at a time, never one of `keep`, until `done` says so. Returns every event. */
function finishUntil(fight: Fight, keep: () => readonly number[], done: (e: Event[]) => boolean) {
  const all: Event[] = [];
  for (let n = 0; n < 100; n++) {
    const [next] = safeLines(fight, keep());
    if (next === undefined) throw new Error('ran out of lines');
    const events = fight.finish(next);
    all.push(...events);
    if (done(events)) return all;
  }
  throw new Error('never happened');
}

/**
 * Some work on these lines without finishing any: a cell of each that the truth changes,
 * in one stroke. Returns how many lines got some.
 */
function work(fight: Fight, lines: readonly number[]): number {
  const finished = fight.view().finishedLines().length;
  const cells: number[] = [];
  for (const id of lines) {
    const cell = fight
      .view()
      .lines[id].cells.find(
        (c) => fight.blank(c) && fight.finishedIf([...cells, c]).length === finished,
      );
    if (cell !== undefined) cells.push(cell);
  }
  expect(fight.play(cells)).toEqual([]);
  return cells.length;
}

/** Each power, played on a fight of a side: what it should do there. */
const POWERS: Record<string, (side: Side) => void> = {
  fog(side) {
    const fight = side.start(enemy({ fog: 2 }));
    const { fog } = fight.state;
    expect(fog).toHaveLength(2);
    for (const id of fog) expect(fight.battle.clueFor(id)).toBeNull();
    // Still solvable with the fog up.
    expect(fight.view().solvable({ fog }, 'blank')).toBe(true);
    // Finishing a fogged line lifts its fog and shows its clue.
    // (A grid's order lifts it off the fog; a block's shows a struck line's clue.)
    const [line] = fog;
    fight.finish(line);
    expect(fight.state.struck).toContain(line);
    if (side.rules.order === 'grid') expect(fight.state.fog).not.toContain(line);
    expect(fight.battle.clueFor(line)).toEqual(fight.view().clue(line));
  },

  scramble(side) {
    const fight = side.start(enemy({ scramble: 2 }));
    const { scramble } = fight.state;
    expect(scramble).toHaveLength(2);
    expect(fight.view().solvable({ scramble }, 'blank')).toBe(true);
    for (const id of scramble) {
      const truth = fight.view().clue(id) as number[] | Clue;
      expect(fight.view().canScramble(id)).toBe(true);
      // A grid's runs show as they are (the board view shuffles them); a block's clue
      // keeps its count and loses its pieces.
      expect(fight.battle.clueFor(id)).toEqual(
        side.kind === 'flat' ? truth : { count: (truth as Clue).count, pieces: null },
      );
    }
    const [line] = scramble;
    fight.finish(line);
    expect(fight.state.struck).toContain(line);
    if (side.rules.order === 'grid') expect(fight.state.scramble).not.toContain(line);
    expect(fight.battle.clueFor(line)).toEqual(fight.view().clue(line));
  },

  armor(side) {
    const fight = side.start(enemy({ hp: 100, armor: { targets: 1, attack: 4 } }));
    const targets = [...fight.state.targets];
    expect(targets).toHaveLength(1);
    expect(fight.view().hasShape(targets[0])).toBe(true);
    expect(fight.battle.current.armored).toBe(true);
    // While it's armored a mistake hits for the armor's attack on a grid, the form's on a block.
    expect(hitsOf(fight.mistake(), 'mistake')).toEqual([
      { kind: 'hit', amount: side.rules.armoredAttack === 'armor' ? 4 : 2, cause: 'mistake' },
    ]);

    // Other lines don't hurt it, and every ARMOR_HIT_LINES of them it hits back: a fixed 2
    // on a grid, its own attack on a block.
    const hp = fight.state.enemyHp;
    const events = finishUntil(
      fight,
      () => targets,
      (e) => hitsOf(e, 'armor').length > 0,
    );
    expect(fight.state.enemyHp).toBe(hp);
    expect(dealt(events)).toBe(0);
    const others = fight.state.struck.length;
    expect(others).toBeGreaterThanOrEqual(ARMOR_HIT_LINES);
    expect(others).toBeLessThan(2 * ARMOR_HIT_LINES);
    expect(hitsOf(events, 'armor')).toEqual([
      {
        kind: 'hit',
        amount: side.rules.armorHitBack === 'fixed' ? ARMOR_HIT_DAMAGE : 4,
        cause: 'armor',
      },
    ]);

    // The weak point takes triple damage and breaks the armor; then lines chip again.
    const broke = fight.finish(targets[0]);
    expect(fight.state.targets).toEqual([]);
    expect(fight.battle.current.armored).toBe(false);
    expect(dealt(broke)).toBe(TARGET_DAMAGE);
    expect(fight.state.enemyHp).toBe(hp - TARGET_DAMAGE);
    const [next] = safeLines(fight, []);
    const chipped = fight.finish(next);
    expect(dealt(chipped)).toBeGreaterThanOrEqual(CHIP_DAMAGE);
    expect(hitsOf(chipped, 'armor')).toEqual([]);
  },

  swap(side) {
    const fight = side.start(enemy({ hp: 20, phases: [{ at: 0.96, swap: true }] }));
    // Work on a few lines, then finish one to start the phase.
    const lines = fight.view().lines.map((l) => l.id);
    expect(work(fight, lines)).toBeGreaterThan(2);
    const struck = fight.state.struck.length;
    const events = finishUntil(
      fight,
      () => [],
      (e) => of(e, 'phase').length > 0,
    );
    const [swap] = of(events, 'swap');
    expect(swap).toBeDefined();
    expect(swap.lines).toHaveLength(2);
    expect(fight.state.struck.length).toBeGreaterThan(struck);
    if (side.kind === 'flat') {
      // Two rows or two columns.
      const h = GRID.height;
      expect(swap.lines.every((id) => id < h) || swap.lines.every((id) => id >= h)).toBe(true);
    }
    // The wiped cells are the lines' and blank again, and the lines aren't finished.
    const cells = new Set(swap.lines.flatMap((id) => fight.view().lines[id].cells));
    expect(swap.wiped.length).toBeGreaterThan(0);
    for (const c of swap.wiped) {
      expect(cells.has(c)).toBe(true);
      expect(fight.blank(c)).toBe(true);
    }
    for (const id of swap.lines) expect(fight.view().finishedLines()).not.toContain(id);
    expect(fight.state.swapped).toEqual(swap.lines);

    // Refilling them: the grid keeps each marked until it's finished again; a block's
    // marks go on the next update.
    const refill = fight.finish(...swap.lines);
    for (const id of swap.lines) expect(fight.view().finishedLines()).toContain(id);
    expect(fight.state.swapped).toEqual([]);
    if (side.rules.wipeMarks === 'until-refilled') {
      expect(of(refill, 'cleared').find((e) => e.power === 'swapped')?.lines).toEqual(
        expect.arrayContaining(swap.lines),
      );
    }
  },

  fakes(side) {
    const start = (hitsOn = true) =>
      side.start(enemy({ hp: 30, fakes: { fakes: 1, suspects: 2 } }), { hitsOn });
    const fight = start();
    const { suspects, fakes } = fight.state;
    expect(suspects).toHaveLength(2);
    expect(fakes).toHaveLength(1);
    expect(suspects).toContain(fakes[0]);
    // Solvable without trusting a suspect.
    expect(fight.view().solvable({ suspects }, 'blank')).toBe(true);
    // A block keeps its forgery, a lie; a grid's board view forges it from the clue drawn.
    if (side.kind === 'block') {
      expect(fight.state.forged[fakes[0]]).toBeDefined();
      expect(fight.state.forged[fakes[0]]).not.toEqual(fight.view().clue(fakes[0]));
    } else {
      expect(fight.state.forged).toEqual({});
    }
    const [fake] = fakes;
    const honest = suspects.filter((id) => id !== fake);

    // Calling out a line that isn't a suspect does nothing.
    const plain = fight.view().lines.find((l) => !suspects.includes(l.id))!.id;
    expect(fight.callOut(plain)).toEqual([]);

    // Finishing the forged line: a block's counts (by the truth); a grid's waits for the call-out.
    const hp = fight.state.enemyHp;
    fight.finish(fake);
    expect(fight.state.struck.includes(fake)).toBe(side.rules.fakesCount);

    // Calling out the fake: call-out damage, and it's no longer a suspect.
    const before = fight.state.enemyHp;
    const caught = fight.callOut(fake);
    expect(of(caught, 'caught')).toEqual([{ kind: 'caught', line: fake, amount: CALL_OUT_DAMAGE }]);
    expect(fight.state.enemyHp).toBe(before - CALL_OUT_DAMAGE);
    expect(fight.state.fakes).toEqual([]);
    expect(fight.state.suspects).not.toContain(fake);
    expect(fight.state.enemyHp).toBeLessThan(hp);

    // An honest one, Hits on: the enemy hits back, and it's counted.
    const wrong = fight.callOut(honest[0]);
    expect(wrong[0]).toEqual({ kind: 'honest', line: honest[0] });
    expect(hitsOf(wrong, 'accusation')).toEqual([{ kind: 'hit', amount: 2, cause: 'accusation' }]);
    expect(fight.state.counts.wrongAccusations).toBe(1);

    // Relaxed: it heals instead, never past its max.
    const relaxed = start(false);
    relaxed.finish(relaxed.state.fakes[0]);
    const healthy = relaxed.callOut(relaxed.state.fakes[0]);
    expect(of(healthy, 'caught')).toHaveLength(1);
    const lowered = relaxed.state.enemyHp;
    const honestOne = relaxed.state.suspects[0];
    const healed = relaxed.callOut(honestOne);
    expect(of(healed, 'healed')).toEqual([
      { kind: 'healed', amount: Math.min(FALSE_ACCUSATION_HEAL, relaxed.state.maxHp - lowered) },
    ]);
    expect(relaxed.state.enemyHp).toBe(
      Math.min(relaxed.state.maxHp, lowered + FALSE_ACCUSATION_HEAL),
    );
    expect(hitsOf(healed, 'accusation')).toEqual([]);
  },

  charge(side) {
    const fight = side.start(enemy({ charge: 2 }));
    const charge = () => fight.state.charge!;
    // A warm-up first: a share of the board's lines.
    expect(charge().warmUp).toBe(fight.view().warmUpLines());
    expect(charge().live).toBeNull();
    finishUntil(
      fight,
      () => [],
      () => charge().live !== null,
    );
    expect(charge().warmUp).toBe(0);

    // Two lines that aren't the live one: zapped.
    const live = charge().live!;
    const zap = finishUntil(
      fight,
      () => [live],
      (e) => hitsOf(e, 'zap').length > 0,
    );
    expect(hitsOf(zap, 'zap')).toEqual([{ kind: 'hit', amount: ZAP_DAMAGE, cause: 'zap' }]);
    expect(fight.state.counts.zaps).toBe(1);
    expect(of(zap, 'grounded')).toEqual([]);
    expect(fight.state.struck).not.toContain(live);

    // The live line finished first: grounded, the meter empties, no zap.
    const next = charge().live;
    expect(next).not.toBeNull();
    const grounded = fight.finish(next!);
    expect(of(grounded, 'grounded')).toHaveLength(1);
    expect(hitsOf(grounded, 'zap')).toEqual([]);
    expect(fight.state.counts.zaps).toBe(1);
  },

  ink(side) {
    const fight = side.start(enemy({ hp: 20, phases: [{ at: 0.96, ink: 2 }] }));
    const lines = fight.view().lines.map((l) => l.id);
    expect(work(fight, lines)).toBeGreaterThan(2);
    finishUntil(
      fight,
      () => [],
      (e) => of(e, 'ink').length > 0,
    );
    const ink = [...fight.state.ink];
    expect(ink.length).toBeGreaterThan(0);
    expect(ink.length).toBeLessThanOrEqual(4);
    // Never on a finished line.
    const done = new Set(fight.state.struck.flatMap((id) => fight.view().lines[id].cells));
    for (const c of ink) expect(done.has(c)).toBe(false);
    if (side.kind === 'flat') {
      // A square of cells, 2 across.
      const rows = new Set(ink.map((c) => Math.floor(c / GRID.width)));
      const cols = new Set(ink.map((c) => c % GRID.width));
      expect(rows.size).toBeLessThanOrEqual(2);
      expect(cols.size).toBeLessThanOrEqual(2);
    } else {
      // A patch of one layer, 2 across.
      const points = ink.map((c) => pointOf(BLOCK.dims, c));
      expect(new Set(points.map((p) => p.y)).size).toBe(1);
      expect(new Set(points.map((p) => p.x)).size).toBeLessThanOrEqual(2);
      expect(new Set(points.map((p) => p.z)).size).toBeLessThanOrEqual(2);
    }

    // Finishing a line through it washes those cells.
    const through = fight.view().lines.find((l) => l.cells.includes(ink[0]))!;
    const washed = of(fight.finish(through.id), 'washed').flatMap((e) => e.cells);
    expect(washed).toContain(ink[0]);
    for (const c of washed) expect(fight.state.ink).not.toContain(c);
    // A sponge takes the rest.
    const rest = [...fight.state.ink];
    expect(of(fight.sponge(), 'washed').flatMap((e) => e.cells)).toEqual(rest);
    expect(fight.state.ink).toEqual([]);
  },

  rotate(side) {
    const fight = side.start(enemy({ rotate: 2, fog: 1 }));
    const fogged = fight.state.fog[0];
    const events = finishUntil(
      fight,
      () => [fogged],
      (e) => of(e, 'turn').length > 0,
    );
    expect(of(events, 'turn')).toHaveLength(1);
    expect(fight.state.turn!.meter).toBe(0);
    const before = events.length;
    expect(before).toBeGreaterThan(0);
    if (side.kind === 'flat') {
      // The board turns: every line the battle marks moves with it, rows to columns.
      const turn = gridTurn(GRID.width);
      expect(fight.state.turn!.turns).toBe(1);
      expect(fight.state.fog).toEqual([turn.line(fogged)]);
      expect(fight.battle.clueFor(turn.line(fogged))).toBeNull();
      // The picture turned with it: the struck lines are still the finished ones.
      expect(fight.view().finishedLines()).toEqual(expect.arrayContaining(fight.state.struck));
    } else {
      // Only the camera turns: the block's lines stay put.
      expect(fight.view().turn()).toBeNull();
      expect(fight.state.turn!.turns).toBeUndefined();
      expect(fight.state.fog).toEqual([fogged]);
      expect(fight.battle.clueFor(fogged)).toBeNull();
    }
  },

  bomb(side) {
    const fight = side.start(enemy({ hp: 50 }));
    const hp = fight.state.enemyHp;
    const { events, cells } = fight.bomb();
    // Its damage: the gadget's own on a grid, the bomb's on a block (2 on both).
    const damage = side.kind === 'flat' ? getGadget('bomb')!.effect : { damage: BOMB_DAMAGE };
    expect(of(events, 'chip')[0].amount).toBe((damage as { damage: number }).damage);
    // It works cells out for you: they hold the truth now.
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) expect(fight.right(c)).toBe(true);
    if (side.kind === 'flat') {
      // A square, 3 across on a small board.
      expect(cells.length).toBeLessThanOrEqual(9);
      expect(new Set(cells.map((c) => Math.floor(c / GRID.width))).size).toBeLessThanOrEqual(3);
    } else {
      // The cubes of one line that weren't right.
      const line = fight.view().lines.find((l) => cells.every((c) => l.cells.includes(c)));
      expect(line).toBeDefined();
    }
    // Any line it finished chips too.
    expect(fight.state.enemyHp).toBe(hp - BOMB_DAMAGE - fight.state.struck.length * CHIP_DAMAGE);
    expect(fight.state.counts.gadgetsUsed).toBe(1);
    if (side.rules.gadgetKinds) expect(fight.state.counts.bombsUsed).toBe(1);
  },

  'board switch'(side) {
    // A boss that changes board at 60% and changes back at 30%, like the Curator. It starts
    // on this board and moves to the other.
    const other = SIDES.find((s) => s !== side)!;
    const phases = [
      { at: 0.9, name: 'Warm' },
      { at: 0.6, name: 'Moved', board: other.kind },
      { at: 0.3, name: 'Back', board: side.kind },
    ];
    const boss = enemy({ hp: 20, phases });
    const here = side.start(boss, { maxHp: Math.round((20 * side.lines) / GRID_SIDE.lines) });
    const events = finishUntil(
      here,
      () => [],
      () => here.state.phase >= 1,
    );
    const moved = of(events, 'phase').find((e) => e.index === 1)!;
    expect(moved.phase.board).toBe(other.kind);
    expect(boardAt({ phases }, here.state.phase + 1)).toBe(other.kind);

    // The other board picks the fight up at the same share of HP, with the same phases started.
    const maxHp = Math.round((20 * other.lines) / GRID_SIDE.lines);
    const share = here.state.enemyHp / here.state.maxHp;
    const there = other.start(boss, { maxHp });
    const hp = carryHp(share, maxHp, phases, here.state.phase + 1);
    if (other.kind === 'block') there.battle.carry(hp, new Uint8Array(BLOCK.solution.length));
    else {
      there.state.enemyHp = hp;
      there.battle.startPhases();
    }
    expect(there.state.phase).toBe(here.state.phase);
    expect(there.state.enemyHp / maxHp).toBeLessThanOrEqual(0.6);
    expect(there.state.enemyHp / maxHp).toBeGreaterThan(0.3);
    expect(there.battle.current.name).toBe('Moved');

    // Play on there until it changes back.
    finishUntil(
      there,
      () => [],
      () => there.state.phase >= 2,
    );
    expect(boardAt({ phases }, there.state.phase + 1)).toBe(side.kind);
    expect(there.battle.current.name).toBe('Back');
  },
};

describe('every power on both boards (#167)', () => {
  for (const [power, play] of Object.entries(POWERS)) {
    describe(power, () => {
      for (const side of SIDES) {
        it(`on a ${side.kind === 'flat' ? 'grid' : 'block'}`, () => play(side));
      }
    });
  }

  it('covers every power with a tip, the bomb and the board switch', () => {
    expect(Object.keys(POWERS).sort()).toEqual(
      [...Object.keys(POWER_TIPS), 'bomb', 'board switch'].sort(),
    );
    // And every power the battle names for tip cards.
    const all = new StoryBattle(
      enemy({
        fog: 1,
        scramble: 1,
        armor: { targets: 1, attack: 4 },
        fakes: { fakes: 1, suspects: 2 },
        charge: 3,
        rotate: 3,
        phases: [{ at: 0.5, ink: 2, swap: true }],
      }),
      BLOCK_RULES,
      blockBattleBoard(BLOCK),
      true,
    );
    for (const power of all.powers) expect(POWERS).toHaveProperty(power);
  });
});
