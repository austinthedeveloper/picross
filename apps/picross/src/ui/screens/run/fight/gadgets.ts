import type { Later } from '../../../../game/fight';
import { removeGadget, withBattle } from '../../../../game/run';
import { saveCurrentRun } from '../../../../game/runSave';
import { getGadget, type Gadget } from '@picross/story/puzzles/gadgets';
import { gadgetArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { plural } from '@picross/play-grid/ui/format';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';
import type { ShowPhase } from './phases';

/**
 * The gadget buttons on the battle bar (#28), after any `extras` (like the
 * call-out button, #64). Returns `render` to refresh them.
 */
export function createGadgetTray(
  ctx: FightContext,
  showPhase: ShowPhase,
  later: (e: Later) => void,
  extras: () => HTMLElement[] = () => [],
) {
  /** Why a gadget can't be used right now, or null if it can. */
  const blocker = (gadget: Gadget): string | null => {
    if (ctx.finished || ctx.run()?.status !== 'active') return 'The fight is over';
    if (gadget.effect.kind === 'shield' && !ctx.hitsOn) return 'Nothing hits you in a Relaxed run';
    if (gadget.effect.kind === 'wash' && !ctx.battle().ink?.length) return 'No ink to wipe';
    return null;
  };

  /**
   * A bomb goes off (#115): washes the ink out of the blast and reveals its cells.
   * Any lines that finishes count as usual, through the refresh. Returns the announcement.
   */
  const explode = (): string => {
    const { controls, view } = ctx;
    if (!controls) return '';
    const { state, events } = ctx.step({ kind: 'blast', board: controls.game.board });
    const blasted = events.find((e) => e.kind === 'blasted');
    if (!blasted) return '';
    const { blast, washed } = blasted;
    if (washed.length) {
      ctx.saveBattle(state);
      view?.setInk(state.ink ?? [], washed);
    }
    const revealed = controls.game.reveal(blast.cells);
    view?.flashBlast(blast);
    controls.refresh();
    return `The blast reveals ${plural(revealed.length, 'cell')} around row ${blast.row + 1}, column ${blast.col + 1}.`;
  };

  const use = (gadget: Gadget) => {
    if (blocker(gadget)) return;
    const { state, events } = ctx.step({ kind: 'gadget', effect: gadget.effect });
    let phase = '';
    let hurt = '';
    for (const e of events) {
      if (e.kind === 'phase') phase = showPhase(e);
      else if (e.kind === 'later' && e.do === 'blast') {
        // After what any phase just queued (ink aims for your marks, swaps eat them), so a
        // phase the bomb starts can't undo the blast.
        window.setTimeout(() => {
          const revealed = explode();
          ctx.bar.say([`${gadget.name}!`, hurt, revealed, phase].filter(Boolean).join(' '));
        }, 0);
      } else if (e.kind === 'later') later(e);
      else if (e.kind === 'gadget') {
        saveCurrentRun(withBattle(removeGadget(ctx.run(), gadget.id), state));
        if (e.effect === 'blast') {
          // At 1 HP there's no damage left to deal, but the reveal still helps.
          if (e.dealt) {
            ctx.bar.setEnemyHp(e.hp);
            ctx.bar.hitEnemy(e.dealt);
          }
          playSound('finisher');
          hurt = e.dealt ? `${ctx.form().name} takes ${e.dealt} damage, ${e.hp} HP left.` : '';
        } else if (e.effect === 'wash') {
          ctx.view?.setInk([], e.washed);
          playSound('hint');
          ctx.bar.say(`${gadget.name}! The ink wipes right off.`);
        } else {
          ctx.bar.setShield(state.shield ?? 0);
          playSound('hint');
          ctx.bar.say(`${gadget.name} ready. It blocks the next hit.`);
        }
      }
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
        el('span', { className: 'gadget-icon', ariaHidden: 'true' }, [gadgetArt(gadget.id)]),
        `${gadget.name}${count > 1 ? ` ×${count}` : ''}`,
      );
      return [button];
    });
    ctx.bar.setGadgets([...extras(), ...buttons]);
  };

  render();
  return { render };
}
