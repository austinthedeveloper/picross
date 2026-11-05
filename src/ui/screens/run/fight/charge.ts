import { pickLiveLine } from '../../../../engine/charge';
import { hasLine, lineKey, unionLines, type Line } from '../../../../engine/lines';
import { bump, chargeUp, ZAP_DAMAGE } from '../../../../game/battle';
import { lineName } from '../../../format';
import { playSound } from '../../../sound';
import type { FightContext } from './context';
import { takeHit } from './hits';

/**
 * The charge meter (#67, the Electric Eel). One line is live ⚡. Finish it and you
 * ground the charge; finish `form().charge` other lines first and the enemy zaps you
 * (Hits-on runs). Either way another line goes live. It only moves when you finish a
 * line, never with time, because working a line out is the game.
 */
export function createCharge(ctx: FightContext, onKnockout: () => void) {
  const zap = () => {
    if (ctx.finished || ctx.run()?.status !== 'active') return;
    ctx.bar.zap();
    const { name } = ctx.form();
    if (ctx.hitsOn) ctx.saveBattle(bump(ctx.battle(), 'zaps'));
    const message = ctx.hitsOn
      ? takeHit(ctx, onKnockout, `⚡ ${name} zaps you!`, ZAP_DAMAGE)
      : `⚡ ${name} zaps the board. It fizzles in a Relaxed run.`;
    ctx.controls?.refresh();
    ctx.bar.say(message);
  };

  /**
   * Makes sure a line you can read is live and shows the meter. Returns the newly
   * live line, if there is one. A phase can fog the live line, so this runs after
   * phases too.
   */
  const aim = (): Line | null => {
    const limit = ctx.form().charge;
    if (!limit || !ctx.controls) {
      ctx.bar.setCharge(null);
      ctx.view?.setLive(null);
      return null;
    }
    const state = ctx.battle();
    const avoid = unionLines([state.fog, state.scramble, state.suspects]);
    const { live } = state;
    const stays =
      live &&
      !hasLine(avoid, live.kind, live.index) &&
      !state.struck.includes(lineKey(live.kind, live.index));
    const next = stays
      ? live
      : pickLiveLine(ctx.controls.game.board, ctx.puzzle.solution, state.struck, avoid);
    if (!stays) ctx.saveBattle({ ...state, live: next ?? undefined });
    const charged = state.charged ?? 0;
    const left = `${limit - charged} left`;
    ctx.bar.setCharge(charged / limit, next ? `${lineName(next, true)} · ${left}` : left);
    ctx.view?.setLive(next);
    return stays ? null : next;
  };

  const liveNow = (line: Line | null) => (line ? `⚡ ${lineName(line, true)} is live.` : '');

  return {
    /** Shows the meter once the board is up, and after a phase, which may start the charge or fog the live line. */
    sync() {
      const line = aim();
      if (line) ctx.bar.say(liveNow(line));
    },
    /** Lines you just finished for the first time move the meter. Returns the announcement. */
    finished(lines: Line[]): string {
      const limit = ctx.form().charge;
      if (!limit || !lines.length) return '';
      const { state, grounded, zapped } = chargeUp(ctx.battle(), lines, limit);
      ctx.saveBattle(state);
      if (grounded) playSound('phase');
      // Like ink and swaps, the zap lands outside the redraw that triggered it.
      if (zapped) window.setTimeout(zap, 0);
      const line = aim();
      return [grounded ? '⚡ Grounded! The charge drains away.' : '', liveNow(line)]
        .filter(Boolean)
        .join(' ');
    },
  };
}
