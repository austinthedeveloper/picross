import type { Line } from '../../../../engine/lines';
import { turnBattle, turnDue, turnedPuzzle, turnUp } from '../../../../game/battle';
import { plural } from '../../../format';
import { playSound } from '../../../sound';
import type { FightContext } from './context';

/**
 * The board turns (#83, the Weathervane). Every `form().rotate` lines you finish,
 * the whole board turns a quarter clockwise: the picture, your marks and undo
 * history, the clues, and everything on them (fog, scrambles, weak points,
 * forgeries, wipes, ink, the live line). Rows become columns, so your picture of
 * the board has to turn too. Like the charge, it only moves when you finish a
 * line, never with time. Like a swap, a turn waits until no stroke is in progress,
 * so a drag never paints across a board that just moved.
 */
export function createTurner(
  ctx: FightContext,
  /** Puts back what the board shows on its clues and cells (fog, ink, …), now turned. */
  redraw: () => void,
) {
  let strokes = 0;

  const draw = () => {
    const limit = ctx.form().rotate;
    if (!limit) return ctx.bar.setTurn(null);
    const turning = Math.min(limit, ctx.battle().turning ?? 0);
    const left = limit - turning;
    ctx.bar.setTurn(turning / limit, left ? `Turns in ${plural(left, 'line')}` : 'Turning…');
  };

  const turn = () => {
    const { controls, view } = ctx;
    if (strokes > 0 || !controls || !turnDue(ctx.battle(), ctx.form().rotate)) return;
    if (ctx.finished || controls.game.over || ctx.run()?.status !== 'active') return;
    const state = turnBattle(ctx.battle(), ctx.puzzle.width);
    ctx.saveBattle(state);
    ctx.puzzle = turnedPuzzle(ctx.drawn, state.turns);
    controls.game.turn(ctx.puzzle);
    view?.setClues(ctx.puzzle.clues);
    redraw();
    controls.refresh();
    view?.flashTurn();
    draw();
    playSound('phase');
    ctx.bar.say(`${ctx.form().name} spins. The board turns a quarter clockwise.`);
  };

  return {
    /** Starts counting strokes on the board. */
    attach(board: HTMLElement) {
      board.addEventListener('pointerdown', () => strokes++);
      const lift = () => {
        strokes = Math.max(0, strokes - 1);
        if (!strokes) window.setTimeout(turn, 0);
      };
      board.addEventListener('pointerup', lift);
      board.addEventListener('pointercancel', lift);
    },
    /**
     * Shows the meter once the board is up, and after a phase, which may start or
     * change the count. A turn that was due when the page closed happens now.
     */
    sync() {
      draw();
      window.setTimeout(turn, 0);
    },
    /** Lines you just finished for the first time move the count toward the next turn. */
    finished(lines: Line[]) {
      if (!ctx.form().rotate || !lines.length) return;
      ctx.saveBattle(turnUp(ctx.battle(), lines));
      draw();
      // Outside the redraw that triggered it, like ink, swaps and zaps.
      window.setTimeout(turn, 0);
    },
  };
}
