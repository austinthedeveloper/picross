import { absorbHit } from '../../../../game/battle';
import { damage } from '../../../../game/run';
import { saveCurrentRun } from '../../../../game/runSave';
import { el } from '@picross/shared/ui/dom';
import { playSound } from '@picross/shared/ui/sound';
import type { EndState } from '../../gameScreen';
import type { FightContext } from './context';

/**
 * The enemy hits you in a Hits-on fight (a wrong fill, by default): a patch kit's
 * shield blocks it, otherwise the enemy hits your run HP for `amount`, or its
 * current attack. `lead` opens the announcement, which this returns.
 */
export function takeHit(
  ctx: FightContext,
  onKnockout: () => void,
  lead = 'Wrong cell!',
  amount = ctx.form().attack,
): string {
  const shielded = absorbHit(ctx.battle());
  if (shielded.blocked) {
    ctx.saveBattle(shielded.state);
    ctx.bar.setShield(shielded.state.shield ?? 0);
    ctx.bar.block();
    playSound('block');
    return `${lead} ${ctx.form().name} attacks, but the patch kit blocks it.`;
  }
  const { name } = ctx.form();
  const run = damage(ctx.run(), amount);
  saveCurrentRun(run);
  ctx.bar.setPlayerHp(run.hp, run.maxHp);
  ctx.bar.hitPlayer(amount);
  if (run.status === 'lost') {
    playSound('knockout', 0.3); // after the hit's own sound
    onKnockout();
    return `${name} hits you for ${amount}. You're knocked out.`;
  }
  return `${lead} ${name} hits you for ${amount}. ${run.hp} HP left.`;
}

/** The knocked-out panel once the run is lost. */
export function knockedOut(ctx: FightContext): EndState | null {
  if (ctx.run()?.status !== 'lost') return null;
  return {
    title: 'Knocked out',
    note: `${ctx.form().name} wins this round. The run is over.`,
    actions: [
      el('a', { className: 'button primary', href: '#/run', textContent: 'See results →' }),
    ],
  };
}
