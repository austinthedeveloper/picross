import { describe, expect, it } from 'vitest';
import type { Clue } from '@picross/block/engine/clues';
import { Battle } from '@picross/block/game/battle';
import { blockFightBoard, finishedLines } from '@picross/block/game/fightBoard';
import { BROKEN, PAINTED } from '@picross/block/game/game';
import { getPuzzle } from '@picross/block/puzzles/index';
import type { Enemy } from '@picross/block/story/data';
import {
  ARMOR_HIT_DAMAGE,
  StoryBattle,
  type BattleBoard,
  type FightEnemy,
  type FightState,
  type GridEvent,
} from './battle';
import { BLOCK_RULES, GRID_RULES, type FightRules } from './rules';

/**
 * The one battle (#166). Cubed's fights are its golden traces and battle tests
 * (packages/block), which run it with `BLOCK_RULES` unchanged; these check what the block
 * doesn't use: each rule's other value, and powers whose lines come from a pool. They play
 * on a block, with every clue showing, since that's a real board the story's tests may use.
 */

const puzzle = getPuzzle('mushroom')!;
const board: BattleBoard<Clue, Uint8Array> = {
  at: (blocks) => blockFightBoard(puzzle, blocks && { blocks }),
  scrambled: (clue) => ({ count: clue.count, pieces: null }),
};
const blank = () => new Uint8Array(puzzle.solution.length);
/** Breaks every cube outside the shape in a line, and paints a line that's all shape. */
function finish(blocks: Uint8Array, line: number) {
  const cells = puzzle.lines[line].cells;
  const full = cells.every((c) => puzzle.solution[c]);
  for (const c of cells) {
    if (!puzzle.solution[c]) blocks[c] = BROKEN;
    else if (full) blocks[c] = PAINTED;
  }
}
/** Lines with none of the shape in them: finishing one is breaking it. */
const empty = puzzle.lines
  .filter((l) => l.cells.every((c) => !puzzle.solution[c]))
  .map((l) => l.id);
const kinds = (events: GridEvent[]) => events.map((e) => e.kind);

const enemy = (extra: Partial<FightEnemy> = {}): FightEnemy => ({
  name: 'Test',
  sprite: 'goblin',
  hp: 200,
  attack: 2,
  ...extra,
});
/** An enemy as Cubed's story reads it: every power a count. */
const blockEnemy = (extra: Partial<Enemy> = {}): Enemy => ({ ...enemy(), ...extra }) as Enemy;
const battle = (
  e: FightEnemy,
  rules: Partial<FightRules> = {},
  hitsOn = true,
  saved?: FightState<Clue>,
) => new StoryBattle(e, { ...BLOCK_RULES, ...rules }, board, hitsOn, saved, { seed: 3 });

describe('the rules', () => {
  it("Cubed's Battle is the one battle with the block's rules", () => {
    const b = new Battle(blockEnemy(), puzzle, true);
    expect(b).toBeInstanceOf(StoryBattle);
    expect(b.rules).toBe(BLOCK_RULES);
  });

  it('the grid differs from the block in every rule it has', () => {
    for (const key of Object.keys(GRID_RULES) as (keyof typeof GRID_RULES)[]) {
      expect(GRID_RULES[key], key).not.toEqual(BLOCK_RULES[key]);
    }
  });

  it('fakesCount: a forged line counts once it is called out, not before', () => {
    const e = enemy({
      fakes: { fakes: { pool: [empty[0]] }, suspects: { pool: empty.slice(0, 2) } },
    });
    const blocks = blank();
    finish(blocks, empty[0]);
    const block = battle(e);
    block.update(blocks);
    expect(block.state.struck).toContain(empty[0]);

    const grid = battle(e, { fakesCount: false });
    expect(grid.update(blocks)).toEqual([]);
    expect(grid.state.struck).toEqual([]);
    grid.callOut(empty[0]);
    grid.update(blocks);
    expect(grid.state.struck).toEqual([empty[0]]);
  });

  it('armorHitBack and armoredAttack: what the armor hits for', () => {
    const e = enemy({ armor: { targets: { pool: [empty[9]] }, attack: 4 } });
    const play = (rules: Partial<FightRules>) => {
      const b = battle(e, rules);
      const blocks = blank();
      for (const id of empty.slice(0, 5)) finish(blocks, id);
      return { back: b.update(blocks), mistake: b.mistake() };
    };
    const block = play({});
    expect(block.back).toEqual([{ kind: 'hit', amount: 4, cause: 'armor' }]);
    expect(block.mistake).toEqual([{ kind: 'hit', amount: 2, cause: 'mistake' }]);
    const grid = play({ armorHitBack: 'fixed', armoredAttack: 'armor' });
    expect(grid.back).toEqual([{ kind: 'hit', amount: ARMOR_HIT_DAMAGE, cause: 'armor' }]);
    expect(grid.mistake).toEqual([{ kind: 'hit', amount: 4, cause: 'mistake' }]);
  });

  it("liveSkips: 'unreadable' never goes live on a line you can't read", () => {
    const hidden = puzzle.lines.map((l) => l.id).filter((id) => !empty.includes(id));
    const e = enemy({ charge: 3, fog: { pool: hidden } });
    for (let seed = 1; seed <= 20; seed++) {
      const b = new StoryBattle(
        e,
        { ...BLOCK_RULES, liveSkips: 'unreadable' },
        board,
        true,
        undefined,
        {
          seed,
        },
      );
      b.state.charge!.warmUp = 0;
      const blocks = blank();
      finish(blocks, empty[0]);
      b.update(blocks);
      // Only the empty lines are readable; one of them goes live.
      expect(empty).toContain(b.state.charge!.live);
    }
  });

  it('countRelaxed: a Relaxed fight counts mistakes only with it', () => {
    const block = battle(enemy(), {}, false);
    block.mistake();
    expect(block.state.counts.mistakes).toBe(1);
    const grid = battle(enemy(), { countRelaxed: false }, false);
    expect(grid.mistake()).toEqual([]);
    expect(grid.state.counts.mistakes).toBe(0);
  });

  it('gadgetKinds: bombs and sponges are told apart only with it', () => {
    const block = battle(enemy());
    block.bomb(blank());
    block.wash();
    block.shieldUp(1);
    expect(block.state.counts).toEqual({
      mistakes: 0,
      zaps: 0,
      wrongAccusations: 0,
      gadgetsUsed: 3,
    });
    const grid = battle(enemy(), { gadgetKinds: true });
    grid.bomb(blank());
    grid.wash();
    grid.shieldUp(1);
    expect(grid.state.counts).toMatchObject({ gadgetsUsed: 3, bombsUsed: 1, spongesUsed: 1 });
  });

  it("wipeMarks: 'until-refilled' keeps a wiped line marked until it's finished again", () => {
    const e = enemy({ hp: 10, phases: [{ at: 0.9, swap: true }] });
    const play = (rules: Partial<FightRules>) => {
      const b = battle(e, rules);
      const blocks = blank();
      // Work on every line, so the swap has something to wipe, and two lines to start the phase.
      for (let i = 0; i < blocks.length; i += 2) if (puzzle.solution[i]) blocks[i] = PAINTED;
      finish(blocks, empty[0]);
      finish(blocks, empty[1]);
      const swap = b.update(blocks).find((e) => e.kind === 'swap');
      expect(swap).toBeDefined();
      const wiped = [...b.state.swapped];
      finish(blocks, empty[2]);
      b.update(blocks);
      return { b, blocks, wiped };
    };
    expect(play({}).b.state.swapped).toEqual([]);
    const { b, blocks, wiped } = play({ wipeMarks: 'until-refilled' });
    expect(b.state.swapped).toEqual(wiped);
    finish(blocks, wiped[0]);
    expect(finishedLines(puzzle, blocks)).toContain(wiped[0]);
    b.update(blocks);
    expect(b.state.swapped).toEqual(wiped.slice(1));
  });
});

describe("order: 'grid'", () => {
  const grid = (e: FightEnemy, hitsOn = true) =>
    new StoryBattle(e, GRID_RULES, board, hitsOn, undefined, { seed: 3 });

  it('takes the lines the board reports: lifts, chips, then starts phases', () => {
    const e = enemy({
      hp: 10,
      fog: { pool: [empty[0]] },
      phases: [{ at: 0.9, fog: { pool: [empty[1], empty[2]] }, swap: true, ink: 2 }],
    });
    const b = grid(e);
    expect(() => b.update(blank())).toThrow();
    const events = b.finished([empty[0]], blank());
    expect(kinds(events)).toEqual(['cleared', 'chip', 'phase', 'due', 'due']);
    expect(events[0]).toEqual({ kind: 'cleared', power: 'fog', lines: [empty[0]] });
    expect(events[2]).toMatchObject({ index: 0, fogged: [empty[1], empty[2]] });
    // The swap and the ink wait for the caller.
    expect(events.slice(3)).toEqual([
      { kind: 'due', power: 'swap' },
      { kind: 'due', power: 'ink', size: 2, count: undefined },
    ]);
    expect(b.state.fog).toEqual([empty[1], empty[2]]);
    expect(b.state.swapped).toEqual([]);
    // A refilled line comes again: it lifts, but it's struck already.
    expect(b.finished([empty[0]], blank())).toEqual([
      { kind: 'chip', amount: 0, lines: [empty[0]] },
    ]);
  });

  it('a call-out, a gadget or damage can start phases', () => {
    const e = enemy({
      hp: 10,
      fakes: { fakes: { pool: [empty[0]] }, suspects: { pool: empty.slice(0, 2) } },
      phases: [{ at: 0.5, name: 'Half' }, { at: 0.3 }, { at: 0.1 }],
    });
    const b = grid(e);
    expect(kinds(b.accuse(empty[0]))).toEqual(['caught', 'phase']);
    expect(b.current.name).toBe('Half');
    // The bomb deals the gadget's damage, and its blast waits.
    expect(b.use({ kind: 'blast', damage: 2 })).toEqual([
      { kind: 'chip', amount: 2, lines: [] },
      { kind: 'phase', phase: e.phases![1], index: 1, fogged: [], scrambled: [] },
      { kind: 'due', power: 'blast' },
    ]);
    expect(b.state.counts).toMatchObject({ gadgetsUsed: 1, bombsUsed: 1 });
    expect(kinds(b.damage(2))).toEqual(['chip', 'phase']);
  });

  it('the charge shows when it first aims, and a zap waits', () => {
    const b = grid(enemy({ charge: 2 }));
    expect(b.state.charge).toEqual({ every: 2, meter: 0, live: null });
    expect(b.aim()).toMatchObject([{ kind: 'charge', every: null }]);
    const [aimed] = b.aim(blank());
    expect(aimed).toMatchObject({ kind: 'charge', every: 2, warmUp: board.at().warmUpLines() });
    b.state.charge!.warmUp = 0;
    const [live] = b.aim(blank());
    expect(live).toMatchObject({ kind: 'charge', warmUp: 0, picked: true });
    const others = empty.filter((id) => id !== b.state.charge!.live).slice(0, 2);
    expect(b.finished(others, blank()).filter((e) => e.kind === 'due')).toEqual([
      { kind: 'due', power: 'zap' },
    ]);
    expect(b.landZap()).toEqual([{ kind: 'hit', amount: 2, cause: 'zap' }]);
    expect(b.state.counts.zaps).toBe(1);
  });
});

describe('powers from a pool', () => {
  it('take the first lines of the pool, all of them by default', () => {
    const pool = [7, 3, 12, 1];
    const b = battle(
      enemy({
        fog: { pool, count: 2 },
        scramble: { pool: [20, 21] },
        armor: { targets: { pool: [30, 31] }, attack: 4 },
      }),
    );
    expect(b.state.fog).toEqual([7, 3]);
    expect(b.state.scramble).toEqual([20, 21]);
    expect(b.state.targets).toEqual([30, 31]);
  });

  it("a phase's pool skips lines finished or already hidden", () => {
    const e = enemy({
      hp: 10,
      fog: { pool: [empty[3]] },
      phases: [{ at: 0.9, fog: { pool: [empty[0], empty[3], empty[4], empty[5]], count: 2 } }],
    });
    const b = battle(e);
    const blocks = blank();
    finish(blocks, empty[0]);
    finish(blocks, empty[1]);
    expect(kinds(b.update(blocks))).toContain('phase');
    expect(b.state.fog).toEqual([empty[3], empty[4], empty[5]]);
  });

  it('forges the fakes of a pool, each with a clue that lies', () => {
    const b = battle(enemy({ fakes: { fakes: { pool: [5] }, suspects: { pool: [4, 5, 6] } } }));
    expect(b.state.suspects).toEqual([4, 5, 6]);
    expect(b.state.fakes).toEqual([5]);
    expect(b.clueFor(5)).not.toEqual(puzzle.allClues[5]);
    expect(b.clueFor(4)).toEqual(puzzle.allClues[4]);
  });
});

describe('saves', () => {
  it('loads a block fight saved before the one battle, as it is', () => {
    // A Cubed save's `battle` (picross:run.block.current), from before #166.
    const saved = {
      enemyHp: 40,
      maxHp: 60,
      phase: 0,
      struck: [1, 2],
      fog: [5],
      scramble: [],
      targets: [],
      armorLines: 0,
      suspects: [],
      fakes: [],
      forged: {},
      charge: { every: 5, meter: 2, live: 9, warmUp: 0 },
      ink: [],
      swapped: [],
      shield: 1,
      seed: 77,
      counts: { mistakes: 1, zaps: 0, wrongAccusations: 0, gadgetsUsed: 1 },
    };
    const text = JSON.stringify(saved);
    const b = new Battle(blockEnemy({ hp: 60, charge: 5 }), puzzle, true, JSON.parse(text));
    expect(JSON.stringify(b.state)).toBe(text);
    expect(b.clueFor(5)).toBeNull();
  });
});
