import { pickSwap } from '../../../../engine/swap';
import { playSound } from '../../../sound';
import type { FightContext } from './context';

/**
 * The Mimic's swaps (#48): two rows or columns get swapped and wiped. Swaps wait
 * until no stroke is in progress, so a drag never paints into lines just wiped.
 */
export function createSwapper(ctx: FightContext) {
  let strokes = 0;
  let pending = 0;

  const run = () => {
    if (strokes > 0 || !ctx.controls) return;
    for (; pending > 0; pending--) {
      const swap = pickSwap(ctx.controls.game.board, ctx.puzzle.solution);
      if (!swap) continue;
      const [a, b] = swap.lines;
      ctx.controls.game.wipe(swap.cells);
      ctx.controls.refresh();
      ctx.view?.flashSwap(swap.kind, a, b);
      playSound('phase');
      const lines = swap.kind === 'row' ? 'rows' : 'columns';
      ctx.bar.say(
        `${ctx.form().name} swapped ${lines} ${a + 1} and ${b + 1} and ate your marks! Fill them in again.`,
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
