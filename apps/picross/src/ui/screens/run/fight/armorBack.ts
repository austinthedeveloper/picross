import { ARMOR_HIT_LINES } from '../../../../game/battle';
import { haptic } from '@picross/shared/ui/haptics';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';
import { hitOf, takeHit } from './hits';

/**
 * Armor hits back (#116): every few lines you finish that aren't weak points costs
 * HP (Hits-on runs). Without it, leaving the weak points until last skips the enemy's
 * phases for free, because lines deal no damage under armor. It only moves when you
 * finish a line, never with time, because working a line out is the game. `gridStep`
 * keeps the meter; this shows it and lands the hit.
 */
export function createArmorBack(ctx: FightContext, onKnockout: () => void) {
  const hit = () => {
    if (ctx.finished || ctx.run()?.status !== 'active') return;
    const { name } = ctx.form();
    const { state, events, changed } = ctx.step({ kind: 'hit-back', hitsOn: ctx.hitsOn });
    if (ctx.hitsOn) {
      playSound('hit');
      haptic('hit');
    }
    if (changed) ctx.saveBattle(state);
    const message = ctx.hitsOn
      ? takeHit(ctx, onKnockout, `🛡 ${name}'s armor hits back!`, hitOf(events))
      : `🛡 ${name}'s armor hits back. It fizzles in a Relaxed run.`;
    ctx.controls?.refresh();
    ctx.bar.say(message);
  };

  const draw = () => {
    if (ctx.form().armored) ctx.bar.setArmorLines(ctx.battle().armorLines ?? 0, ARMOR_HIT_LINES);
  };

  return {
    /** Shows the meter once the board is up, and after lines move it. */
    draw,
    /** Like ink, swaps and zaps, the hit lands outside the redraw that triggered it. */
    hitLater() {
      window.setTimeout(hit, 0);
    },
  };
}
