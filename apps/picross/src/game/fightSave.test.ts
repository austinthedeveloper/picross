import { describe, expect, it } from 'vitest';
import { Battle, type BattleState as BlockState } from '@picross/block/game/battle';
import { hashString } from '@picross/block/puzzles/hide';
import { getEncounter as getBlockEncounter } from '@picross/block/story/data';
import { FIGHT_SAVE } from '@picross/story/fight/save';
import { getEncounter } from '../puzzles/runs';
import { boardAt } from '@picross/story/fight/switch';
import { advancePhase, startBattle, type Enemy } from './battle';
import { loadFight, saveFight, type SavedRun } from './fightSave';
import { startRun, withBattle, withBlock, withBoard, type RunState } from './run';

const curator = getEncounter('curator')!.enemy!;
const blockCurator = getBlockEncounter('curator')!;
const eel = getEncounter('electric-eel')!.enemy!;

/** Through JSON, as `picross:run` stores it. */
const stored = (run: RunState): SavedRun => JSON.parse(JSON.stringify(saveFight(run)));
/** Saved, then loaded again, as a reload does. */
const reloaded = (run: RunState) => loadFight(stored(run));

/** The board the encounter opens (`encounter.ts`): its phase's, from the flat battle. */
const boardOf = (enemy: Enemy, run: RunState) => boardAt(enemy, run.battle?.phase);

/** A flat battle `phases` phases in, at `share` of the enemy's HP. */
function flatAt(enemy: Enemy, share: number) {
  const battle = { ...startBattle(enemy), enemyHp: Math.floor(share * enemy.hp) };
  return advancePhase(enemy, battle, 20).state;
}

/** The Curator's block battle as its fight screen saves it, some way in. */
function blockBattle() {
  const battle = new Battle(blockCurator.enemy!, blockCurator.puzzle, true, undefined, {
    seed: hashString('curator'),
  });
  battle.state.enemyHp = Math.floor(battle.state.maxHp * 0.5);
  battle.state.counts.mistakes = 2;
  return JSON.parse(JSON.stringify(battle.state)) as unknown;
}

const flatBoard = { cells: '0120'.repeat(100), elapsed: 61_000, mode: 'battle' as const };
const blockBoard = { blocks: '2010'.repeat(20), elapsed: 30_000 };

describe('one count for a switching fight (#170)', () => {
  /** The Curator some way into its block, its flat battle having counted some. */
  function switching() {
    const flat = { ...flatAt(curator, 0.59), counts: { wrongFills: 1, gadgetsUsed: 1 } };
    let run = withBattle(withBoard(startRun('closing-time', 18), flatBoard), flat);
    run = withBlock(run, { board: blockBoard, battle: blockBattle() });
    return run;
  }
  const blockCounts = (run: RunState) => (run.block!.battle as BlockState).counts;

  it("a save from this version is read as it is: the block's counts are the fight's", () => {
    const run = switching();
    expect(reloaded(run)).toEqual(run);
  });

  it('an older save (version 2) adds the two boards up, on both', () => {
    const run = switching();
    const v2 = { ...stored(run), fight: { ...stored(run).fight!, v: 2 } };
    const back = loadFight(v2);
    expect(back.battle!.counts).toEqual({ wrongFills: 3, gadgetsUsed: 1 });
    expect(blockCounts(back)).toMatchObject({ mistakes: 3, gadgetsUsed: 1, zaps: 0 });
    // Everything else as it was.
    expect({ ...back.battle, counts: undefined }).toEqual({ ...run.battle, counts: undefined });
    expect(back.board).toEqual(run.board);
    expect(back.block!.board).toEqual(run.block!.board);
    // Saved again, it's this version's, and reads back the same: added up once.
    expect(reloaded(back)).toEqual(back);
  });

  it("an older save in the run's own fields adds them up too", () => {
    const run = switching();
    const back = loadFight(JSON.parse(JSON.stringify(run)));
    expect(back.battle!.counts).toEqual({ wrongFills: 3, gadgetsUsed: 1 });
    expect(blockCounts(back).mistakes).toBe(3);
  });

  it('a fight with no block, or a block with no flat battle, is left alone', () => {
    const flat = withBattle(startRun('closing-time', 18), flatAt(curator, 0.7));
    expect(loadFight(flat)).toBe(flat);
    const block = withBlock(startRun('closing-time', 18), { battle: blockBattle() });
    expect(loadFight(block)).toBe(block);
  });
});

describe('a fight as the run saves it (#169)', () => {
  it('a grid fight: its board and battle are the flat entry, as they were', () => {
    const run = withBattle(withBoard(startRun('deep-end', 14, 'hearts'), flatBoard), {
      ...startBattle(eel),
      enemyHp: 30,
      struck: ['r1', 'c4'],
      live: { kind: 'row', index: 3 },
    });
    const saved = stored(run);
    expect(saved).not.toHaveProperty('board');
    expect(saved).not.toHaveProperty('battle');
    expect(saved.fight).toEqual({
      v: FIGHT_SAVE,
      boards: { flat: { board: flatBoard, battle: run.battle } },
    });
    const back = loadFight(saved);
    expect(back).toEqual(run);
    // Byte for byte, key order too: the fight screen reads the battle as it was written.
    expect(JSON.stringify(back.battle)).toBe(JSON.stringify(run.battle));
    expect(boardOf(eel, back)).toBe('flat');
  });

  it("a block fight (Cubed's, or a block with no flat battle): the block's entry", () => {
    const run = withBlock(startRun('closing-time', 18), {
      board: blockBoard,
      battle: blockBattle(),
    });
    const saved = stored(run);
    expect(saved.fight?.boards).toEqual({ block: run.block });
    expect(reloaded(run)).toEqual(run);
  });

  it('a switching fight saved on its block resumes on the block, each board as it was', () => {
    // Four phases in: the fourth unfolds it. The flat board waits as it was left.
    const flat = flatAt(curator, 0.59);
    expect(flat.phase).toBe(4);
    let run = withBattle(withBoard(startRun('closing-time', 18), flatBoard), flat);
    run = withBlock(run, { board: blockBoard, battle: blockBattle() });
    const saved = stored(run);
    expect(Object.keys(saved.fight!.boards)).toEqual(['flat', 'block']);
    const back = loadFight(saved);
    expect(back).toEqual(run);
    expect(JSON.stringify(back.block)).toBe(JSON.stringify(run.block));
    expect(boardOf(curator, back)).toBe('block');
  });

  it('a switching fight saved back on its flat board resumes flat, the block kept', () => {
    const flat = flatAt(curator, 0.29);
    expect(flat.phase).toBe(5);
    let run = withBattle(withBoard(startRun('closing-time', 18), flatBoard), flat);
    run = withBlock(run, { board: blockBoard, battle: blockBattle() });
    const back = reloaded(run);
    expect(back).toEqual(run);
    expect(boardOf(curator, back)).toBe('flat');
  });

  it('a fight with no battle yet, a dig and a rest keep their board where it was', () => {
    const run = withBoard(startRun('first-job', 12), flatBoard);
    expect(saveFight(run)).toBe(run);
    expect(stored(run)).toEqual(run);
    expect(reloaded(run)).toEqual(run);
  });

  it('a cleared encounter saves no fight', () => {
    const run = startRun('first-job', 12);
    expect(stored(run)).not.toHaveProperty('fight');
  });

  it('saving and loading again changes nothing', () => {
    let run = withBattle(withBoard(startRun('closing-time', 18), flatBoard), flatAt(curator, 0.59));
    run = withBlock(run, { board: blockBoard, battle: blockBattle() });
    const once = stored(run);
    expect(stored(loadFight(once))).toEqual(once);
    // (Only a save goes through `loadFight`: the run as the game holds it isn't one.)
    expect(loadFight(stored(loadFight(once)))).toEqual(loadFight(once));
  });
});

describe('older saves load as they are', () => {
  it('a 2D fight from before #169 (board and battle on the run)', () => {
    const old = {
      ...startRun('deep-end', 14, 'hearts'),
      board: flatBoard,
      battle: { enemyHp: 45, struck: [], warmUp: 0 },
    };
    const run = loadFight(JSON.parse(JSON.stringify(old)));
    expect(run).toEqual(old);
    // Its next save is the new shape, and loads back the same.
    expect(stored(run).fight?.boards.flat).toEqual({ board: old.board, battle: old.battle });
    expect(reloaded(run)).toEqual(old);
  });

  it("a switching fight from before #169, with the block in the run's `block`", () => {
    const old = {
      ...startRun('closing-time', 18),
      board: flatBoard,
      battle: flatAt(curator, 0.59),
      block: { board: blockBoard, battle: blockBattle() },
    };
    const run = loadFight(JSON.parse(JSON.stringify(old)));
    // One count since #170: the flat battle counted nothing, so both have the block's.
    expect(run.battle!.counts).toEqual({ wrongFills: 2 });
    expect(run).toEqual({ ...old, battle: { ...old.battle, counts: { wrongFills: 2 } } });
    expect(boardOf(curator, run)).toBe('block');
    expect(stored(run).fight?.boards).toEqual({
      flat: { board: old.board, battle: run.battle },
      block: old.block,
    });
  });

  it('an older version writing the old fields beside a fight save wins, whole', () => {
    // A device still on an older version opened the fight (it can't read `fight`), so it
    // started the fight again and saved it its way: that's the fight it last showed.
    let run = withBattle(withBoard(startRun('closing-time', 18), flatBoard), flatAt(curator, 0.59));
    run = withBlock(run, { board: blockBoard, battle: blockBattle() });
    const fresh = { cells: '0'.repeat(400) };
    const both = { ...stored(run), board: fresh };
    const back = loadFight(both);
    expect(back).not.toHaveProperty('fight');
    expect(back).not.toHaveProperty('battle');
    expect(back).not.toHaveProperty('block');
    expect(back.board).toEqual(fresh);
  });

  it("leaves a later version's fight save where it is", () => {
    const later = { ...startRun('first-job', 12), fight: { v: FIGHT_SAVE + 1, anything: true } };
    const run = loadFight(later as unknown as SavedRun);
    expect(run).toBe(later);
    expect(saveFight(run)).toBe(run);
  });
});
