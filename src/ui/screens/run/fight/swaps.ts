import { pickSwapRows } from '../../../../engine/swap';
import { playSound } from '../../../sound';
import type { FightContext } from './context';

/**
 * The Mimic's row swaps (#48). Swaps wait until no stroke is in progress, so a
 * drag never paints into rows that just moved.
 */
export function createSwapper(ctx: FightContext) {
  let strokes = 0;
  let pending = 0;

  const run = () => {
    if (strokes > 0 || !ctx.controls) return;
    for (; pending > 0; pending--) {
      const rows = pickSwapRows(ctx.controls.game.board, ctx.puzzle.solution);
      if (!rows) continue;
      ctx.controls.game.swapRows(...rows);
      ctx.controls.refresh();
      ctx.view?.flashSwap(...rows);
      playSound('phase');
      ctx.bar.say(
        `${ctx.form().name} swapped rows ${rows[0] + 1} and ${rows[1] + 1}! Undo can't help.`,
      );
    }
  };

  return {
    /** Starts counting strokes on the board. */
    attach(board: HTMLElement) {
      board.addEventListener('pointerdown', () => strokes++);
      const lift = () => {
        strokes = Math.max(0, strokes - 1);
        if (!strokes && pending) window.setTimeout(run, 0);
      };
      board.addEventListener('pointerup', lift);
      board.addEventListener('pointercancel', lift);
    },
    /** Queues swaps; they run outside the redraw that triggered them. */
    queue(count: number) {
      pending += count;
      window.setTimeout(run, 0);
    },
  };
}

export type Swapper = ReturnType<typeof createSwapper>;
