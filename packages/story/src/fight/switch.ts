import type { BoardKind } from './board';

/**
 * A boss that switches board (the Curator, docs/story-combined.md): some of its phases move
 * the fight onto a block or back to the flat grid (a phase's `board`). It's one fight the
 * whole way: one HP bar, one set of phases, one patch kit and one set of counts. Each board
 * keeps its own progress (its marks, and the lines its powers took), so going back finds it
 * as you left it.
 *
 * The fight is on whichever board its latest board-changing phase names (`boardAt`). When it
 * moves, the battle on the new board takes the fight over from the one it leaves
 * (`StoryBattle.enterBoard`): the same share of the enemy's HP (`hpShare`, since a block has
 * more lines and so more HP), the patch kit and the counts, and then the phases the fight
 * has reached start there, so their powers land on the new board.
 *
 * Pure: the 2D game's run screen does the moving (`apps/picross/src/ui/screens/run/`).
 */

/** What a phase says about the board. */
interface Switching {
  phases?: readonly { board?: BoardKind }[];
}

/** The board a fight is on once `started` of the enemy's phases have started. */
export function boardAt(enemy: Switching, started = 0): BoardKind {
  let board: BoardKind = 'flat';
  for (const phase of (enemy.phases ?? []).slice(0, started)) board = phase.board ?? board;
  return board;
}

/** Whether any phase moves the fight onto a block. */
export const switchesBoard = (enemy: Switching) =>
  (enemy.phases ?? []).some((p) => p.board === 'block');

/**
 * Enemy HP on a board with `maxHp`, at `share` of it, so that exactly `started` phases have
 * started: the two boards scale HP differently, and rounding mustn't skip or repeat a phase.
 * Never 0 (the fight isn't over) and never above full.
 */
export function hpShare(
  share: number,
  maxHp: number,
  phases: readonly { at: number }[],
  started: number,
): number {
  let hp = Math.ceil(share * maxHp);
  if (started > 0) hp = Math.min(hp, Math.floor(phases[started - 1].at * maxHp));
  return Math.max(1, Math.min(maxHp, hp));
}
