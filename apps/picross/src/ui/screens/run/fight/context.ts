import { boardAt } from '@picross/story/fight/switch';
import {
  currentForm,
  startBattle,
  turnedPuzzle,
  type BattleState,
  type Enemy,
} from '../../../../game/battle';
import { gridStep, type FightInput, type FightStep } from '../../../../game/fight';
import { withBattle, type RunState } from '../../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../../game/runSave';
import type { Puzzle } from '@picross/grid/puzzles/format';
import type { BoardView } from '@picross/play-grid/ui/board/boardView';
import { createBattleBar, type BattleBar } from '@picross/story/ui/components/battleBar';
import type { BoardControls } from '@picross/play-grid/ui/screens/gameScreen';

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
  /**
   * The fight's rules (`gridStep`) for what just happened, on the battle as saved. Saves
   * nothing; `changed` says whether the step changed the battle.
   */
  step(input: FightInput): FightStep & { changed: boolean };
  /** Set once the board exists (see `onBoard`). */
  view: BoardView | null;
  controls: BoardControls | null;
  /** Set when the finisher lands; gadgets stop working. */
  finished: boolean;
}

export function createFightContext(
  enemy: Enemy,
  puzzle: Puzzle,
  /** Called once a phase moves the fight onto a block (a boss that switches board). */
  onBlock: () => void = () => {},
  /** A bar the fight is handed (a boss that switches board keeps one, #171), or a new one. */
  given?: BattleBar,
): FightContext {
  let leaving = false;
  const run = (): RunState => getCurrentRun()!;
  const battle = () => run().battle ?? startBattle(enemy);
  const ctx: FightContext = {
    enemy,
    puzzle: turnedPuzzle(puzzle, battle().turns),
    drawn: puzzle,
    bar: given ?? createBattleBar(enemy, battle().enemyHp),
    hitsOn: run().mode === 'hearts',
    run,
    battle,
    form: () => currentForm(enemy, battle()),
    saveBattle(state) {
      saveCurrentRun(withBattle(run(), state));
      // After the current handler finishes, so it doesn't draw on a board that's gone.
      if (!leaving && !ctx.finished && boardAt(enemy, state.phase) === 'block') {
        leaving = true;
        window.setTimeout(() => {
          if (!ctx.finished) onBlock();
        }, 0);
      }
    },
    step(input) {
      const before = battle();
      const step = gridStep(enemy, ctx.puzzle, before, input);
      return { ...step, changed: step.state !== before };
    },
    view: null,
    controls: null,
    finished: false,
  };
  // A bar from the block has the block's HP: this board's is out of the enemy's own.
  if (given) ctx.bar.setEnemyHp(battle().enemyHp, enemy.hp);
  ctx.bar.setForm(ctx.form().name, ctx.form().sprite);
  ctx.bar.setPlayerHp(run().hp, run().maxHp);
  ctx.bar.setShield(battle().shield ?? 0);
  return ctx;
}
