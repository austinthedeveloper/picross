import { useGadget } from '../../../../game/battle';
import { removeGadget, withBattle } from '../../../../game/run';
import { saveCurrentRun } from '../../../../game/runSave';
import { getGadget, type Gadget } from '../../../../puzzles/gadgets';
import { el } from '../../../dom';
import { playSound } from '../../../sound';
import type { FightContext } from './context';
import type { CheckPhase } from './phases';

/**
 * The gadget buttons on the battle bar (#28), after any `extras` (like the
 * call-out button, #64). Returns `render` to refresh them.
 */
export function createGadgetTray(
  ctx: FightContext,
  checkPhase: CheckPhase,
  extras: () => HTMLElement[] = () => [],
) {
  /** Why a gadget can't be used right now, or null if it can. */
  const blocker = (gadget: Gadget): string | null => {
    if (ctx.finished || ctx.run()?.status !== 'active') return 'The fight is over';
    if (gadget.effect.kind === 'shield' && !ctx.hitsOn) return 'Nothing hits you in a Relaxed run';
    if (gadget.effect.kind === 'wash' && !ctx.battle().ink?.length) return 'No ink to wipe';
    if (gadget.effect.kind === 'damage' && ctx.battle().enemyHp <= 1) {
      return 'Only the finished picture can defeat it now';
    }
    return null;
  };

  const use = (gadget: Gadget) => {
    if (blocker(gadget)) return;
    const inkBefore = ctx.battle().ink ?? [];
    const used = useGadget(ctx.battle(), gadget.effect);
    const { state, message } = checkPhase(used.state);
    saveCurrentRun(withBattle(removeGadget(ctx.run(), gadget.id), state));
    if (gadget.effect.kind === 'damage') {
      ctx.bar.setEnemyHp(state.enemyHp);
      ctx.bar.hitEnemy(used.dealt);
      playSound('finisher');
      ctx.bar.say(
        `${gadget.name}! ${ctx.form().name} takes ${used.dealt} damage, ${state.enemyHp} HP left. ${message}`,
      );
    } else if (gadget.effect.kind === 'wash') {
      ctx.view?.setInk([], inkBefore);
      playSound('hint');
      ctx.bar.say(`${gadget.name}! The ink wipes right off.`);
    } else {
      ctx.bar.setShield(state.shield ?? 0);
      playSound('hint');
      ctx.bar.say(`${gadget.name} ready. It blocks the next hit.`);
    }
    render();
  };

  const render = () => {
    const counts = new Map<string, number>();
    for (const id of ctx.run()?.gadgets ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    const buttons = [...counts].flatMap(([id, count]) => {
      const gadget = getGadget(id);
      if (!gadget) return [];
      const reason = blocker(gadget);
      const held = count > 1 ? `, ${count} held` : '';
      const button = el('button', {
        className: 'gadget',
        disabled: Boolean(reason),
        title: reason ?? gadget.description,
        ariaLabel: `Use ${gadget.name}${held}. ${reason ?? gadget.description}`,
        onclick: () => use(gadget),
      });
      button.append(
        el('span', { className: 'gadget-icon', textContent: gadget.icon, ariaHidden: 'true' }),
        `${gadget.name}${count > 1 ? ` ×${count}` : ''}`,
      );
      return [button];
    });
    ctx.bar.setGadgets([...extras(), ...buttons]);
  };

  render();
  return { render };
}
