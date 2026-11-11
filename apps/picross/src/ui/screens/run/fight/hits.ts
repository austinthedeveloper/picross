import type { FightEvent, HitEvent } from '../../../../game/fight';
import { damage } from '../../../../game/run';
import { saveCurrentRun } from '../../../../game/runSave';
import { el } from '@picross/shared/ui/dom';
import { playSound } from '@picross/shared/ui/sound';
import type { EndState } from '@picross/play-grid/ui/screens/gameScreen';
import type { FightContext } from './context';

/** The hit (or the block) among a step's events. */
export const hitOf = (events: FightEvent[]) =>
  events.find((e): e is HitEvent => e.kind === 'hit' || e.kind === 'blocked')!;

/**
 * The enemy hits you in a Hits-on fight (a wrong fill, by default), as `gridStep` said:
 * a patch kit's shield blocks it, otherwise the enemy hits your run HP. Save the step's
 * battle first. `lead` opens the announcement, which this returns.
 */
export function takeHit(
  ctx: FightContext,
  onKnockout: () => void,
  lead = 'Wrong cell!',
  hit: HitEvent,
): string {
  if (hit.kind === 'blocked') {
    ctx.bar.setShield(ctx.battle().shield ?? 0);
    ctx.bar.block();
    playSound('block');
    return `${lead} ${ctx.form().name} attacks, but the patch kit blocks it.`;
  }
  const { amount } = hit;
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
