import {
  currentForm,
  startBattle,
  turnedPuzzle,
  type BattleState,
  type Enemy,
} from '../../../../game/battle';
import { withBattle, type RunState } from '../../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../../game/runSave';
import type { Puzzle } from '../../../../puzzles/format';
import type { BoardView } from '../../../board/boardView';
import { createBattleBar, type BattleBar } from '../../../components/battleBar';
import type { BoardControls } from '../../gameScreen';

/**
 * What every fight mechanic shares. The battle lives in the saved run, so it's
 * always read fresh and saved right away; a reload resumes mid-fight.
 */
export interface FightContext {
  enemy: Enemy;
  /** The puzzle as the board stands: turned, if the board has turned (#83). */
  puzzle: Puzzle;
  /** The puzzle as drawn, before any turns. */
  drawn: Puzzle;
  bar: BattleBar;
  /** True in Hits-on runs, where mistakes let the enemy hit you. */
  hitsOn: boolean;
  run(): RunState;
  battle(): BattleState;
  /** The enemy as it is now (name, sprite, attack, armored), after phases and armor. */
  form(): ReturnType<typeof currentForm>;
  /** Saves a new battle state into the run. */
  saveBattle(state: BattleState): void;
  /** Set once the board exists (see `onBoard`). */
  view: BoardView | null;
  controls: BoardControls | null;
  /** Set when the finisher lands; gadgets stop working. */
  finished: boolean;
}

export function createFightContext(enemy: Enemy, puzzle: Puzzle): FightContext {
  const run = (): RunState => getCurrentRun()!;
  const battle = () => run().battle ?? startBattle(enemy);
  const ctx: FightContext = {
    enemy,
    puzzle: turnedPuzzle(puzzle, battle().turns),
    drawn: puzzle,
    bar: createBattleBar(enemy, battle().enemyHp),
    hitsOn: run().mode === 'hearts',
    run,
    battle,
    form: () => currentForm(enemy, battle()),
    saveBattle: (state) => saveCurrentRun(withBattle(run(), state)),
    view: null,
    controls: null,
    finished: false,
  };
  ctx.bar.setForm(ctx.form().name, ctx.form().sprite);
  ctx.bar.setPlayerHp(run().hp, run().maxHp);
  ctx.bar.setShield(battle().shield ?? 0);
  return ctx;
}
