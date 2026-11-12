import { plural } from '@picross/shared/ui/format';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';

/**
 * The Mimic's swaps (#48): two rows or columns get swapped and wiped (`gridStep` picks
 * them). Swaps wait until no stroke is in progress, so a drag never paints into lines
 * just wiped.
 */
export function createSwapper(ctx: FightContext) {
  let strokes = 0;
  let pending = 0;

  const run = () => {
    if (strokes > 0 || !ctx.controls) return;
    for (; pending > 0; pending--) {
      const { state, events } = ctx.step({ kind: 'swap', board: ctx.controls.game.board });
      const swapped = events.find((e) => e.kind === 'swapped');
      if (!swapped) continue;
      const { swap } = swapped;
      const [a, b] = swap.lines;
      // Save the wipe before the redraw, so lines it re-opens don't count as new.
      ctx.saveBattle(state);
      ctx.controls.game.wipe(swap.cells);
      ctx.view?.setWiped(swapped.wiped);
      ctx.controls.refresh();
      ctx.view?.flashSwap(swap.kind, a, b);
      playSound('phase');
      const lines = swap.kind === 'row' ? 'rows' : 'columns';
      ctx.bar.say(
        `${ctx.form().name} swapped ${lines} ${a + 1} and ${b + 1} and ate ${plural(swap.cells.length, 'mark')}! Fill them in again.`,
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
