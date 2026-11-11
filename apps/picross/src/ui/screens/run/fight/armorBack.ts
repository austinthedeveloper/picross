import type { Line, LineSet } from '../../../../engine/lines';
import { ARMOR_HIT_DAMAGE, ARMOR_HIT_LINES, armorHitsBack } from '../../../../game/battle';
import { haptic } from '../../../haptics';
import { playSound } from '../../../sound';
import type { FightContext } from './context';
import { takeHit } from './hits';

/**
 * Armor hits back (#116): every few lines you finish that aren't weak points costs
 * HP (Hits-on runs). Without it, leaving the weak points until last skips the enemy's
 * phases for free, because lines deal no damage under armor. It only moves when you
 * finish a line, never with time, because working a line out is the game.
 */
export function createArmorBack(ctx: FightContext, onKnockout: () => void) {
  const hit = () => {
    if (ctx.finished || ctx.run()?.status !== 'active') return;
    const { name } = ctx.form();
    if (ctx.hitsOn) {
      playSound('hit');
      haptic('hit');
    }
    const message = ctx.hitsOn
      ? takeHit(ctx, onKnockout, `🛡 ${name}'s armor hits back!`, ARMOR_HIT_DAMAGE)
      : `🛡 ${name}'s armor hits back. It fizzles in a Relaxed run.`;
    ctx.controls?.refresh();
    ctx.bar.say(message);
  };

  const draw = () => {
    if (ctx.form().armored) ctx.bar.setArmorLines(ctx.battle().armorLines ?? 0, ARMOR_HIT_LINES);
  };

  return {
    /** Shows the meter once the board is up. */
    show: draw,
    /** Lines you just finished for the first time, with the weak points from before them. */
    finished(lines: Line[], weak: LineSet | undefined) {
      if (!weak || !lines.length) return;
      const { state, hits } = armorHitsBack(ctx.battle(), lines, weak);
      if (state !== ctx.battle()) ctx.saveBattle(state);
      draw();
      // Like ink, swaps and zaps, the hit lands outside the redraw that triggered it.
      for (let n = 0; n < hits; n++) window.setTimeout(hit, 0);
    },
  };
}
