import { absorbHit } from '../../../../game/battle';
import { damage } from '../../../../game/run';
import { saveCurrentRun } from '../../../../game/runSave';
import { el } from '../../../dom';
import type { EndState } from '../../gameScreen';
import type { FightContext } from './context';

/**
 * A wrong fill in a Hits-on fight: a patch kit's shield blocks it, otherwise the
 * enemy hits your run HP for its current attack. Returns the announcement.
 */
export function takeHit(ctx: FightContext, onKnockout: () => void): string {
  const shielded = absorbHit(ctx.battle());
  if (shielded.blocked) {
    ctx.saveBattle(shielded.state);
    ctx.bar.setShield(shielded.state.shield ?? 0);
    ctx.bar.block();
    return `Wrong cell! ${ctx.form().name} attacks, but the patch kit blocks it.`;
  }
  const { name, attack } = ctx.form();
  const run = damage(ctx.run(), attack);
  saveCurrentRun(run);
  ctx.bar.setPlayerHp(run.hp, run.maxHp);
  ctx.bar.hitPlayer(attack);
  if (run.status === 'lost') {
    onKnockout();
    return `${name} hits you for ${attack}. You're knocked out.`;
  }
  return `Wrong cell! ${name} hits you for ${attack}. ${run.hp} HP left.`;
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
