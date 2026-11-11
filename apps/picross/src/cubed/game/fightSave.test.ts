import { describe, expect, it } from 'vitest';
import { Battle } from '@picross/block/game/battle';
import { hashString } from '@picross/block/puzzles/hide';
import { getEncounter } from '@picross/block/story/data';
import { FIGHT_SAVE } from '@picross/story/fight/save';
import { loadFight, saveFight, type SavedRun } from './fightSave';
import { startRun, withBattle, withBoard, type RunState } from './run';

/** Through JSON, as the run save stores it (`picross:run`'s `block`). */
const stored = (run: RunState): SavedRun => JSON.parse(JSON.stringify(saveFight(run)));

/** A story fight's battle as Cubed's fight screen saves it, some way in. */
function battleOf(id: string) {
  const encounter = getEncounter(id)!;
  const battle = new Battle(encounter.enemy!, encounter.puzzle, true, undefined, {
    seed: hashString(id),
  });
  battle.state.enemyHp -= 3;
  battle.state.struck = [0, 2];
  return JSON.parse(JSON.stringify(battle.state)) as unknown;
}

const board = { blocks: '2010'.repeat(8), elapsed: 12_000 };

describe("Cubed's fight as its run saves it (#169)", () => {
  it("a block fight: the block's entry, as it was", () => {
    const run = withBattle(
      withBoard(startRun('first-job', 12, 'hearts'), board),
      battleOf('goblin'),
    );
    const saved = stored(run);
    expect(saved).not.toHaveProperty('board');
    expect(saved).not.toHaveProperty('battle');
    expect(saved.fight).toEqual({
      v: FIGHT_SAVE,
      boards: { block: { board, battle: run.battle } },
    });
    const back = loadFight(saved);
    expect(back).toEqual(run);
    expect(JSON.stringify(back.battle)).toBe(JSON.stringify(run.battle));
    expect(stored(back)).toEqual(saved);
  });

  it('a dig, a rest or a fight with no battle yet keeps its board where it was', () => {
    const run = withBoard(startRun('first-job', 12, 'relaxed'), board);
    expect(saveFight(run)).toBe(run);
    expect(loadFight(stored(run))).toEqual(run);
  });

  it('a run from before #169 loads as it is, and saves the new way', () => {
    const old = { ...startRun('first-job', 12, 'relaxed'), board, battle: battleOf('goblin') };
    const run = loadFight(JSON.parse(JSON.stringify(old)));
    expect(run).toEqual(old);
    expect(stored(run).fight?.boards).toEqual({ block: { board, battle: old.battle } });
  });

  it('old fields beside a fight save win, whole: an older version wrote them last', () => {
    const run = withBattle(
      withBoard(startRun('first-job', 12, 'relaxed'), board),
      battleOf('goblin'),
    );
    const newer = { blocks: '0'.repeat(32) };
    const back = loadFight({ ...stored(run), board: newer });
    expect(back.board).toEqual(newer);
    expect(back).not.toHaveProperty('battle');
    expect(back).not.toHaveProperty('fight');
  });
});
