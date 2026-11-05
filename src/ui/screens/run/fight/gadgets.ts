import { blastSize, pickBlast } from '../../../../engine/blast';
import { blastInk, bump, useGadget, type BattleState } from '../../../../game/battle';
import { removeGadget, withBattle } from '../../../../game/run';
import { saveCurrentRun } from '../../../../game/runSave';
import { getGadget, type Gadget } from '../../../../puzzles/gadgets';
import { gadgetArt } from '../../../art';
import { el } from '../../../dom';
import { plural } from '../../../format';
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
    return null;
  };

  /**
   * A bomb goes off (#115): washes the ink out of the blast and reveals its cells.
   * Any lines that finishes count as usual, through the refresh. Returns the announcement.
   */
  const explode = (): string => {
    const { controls, view, puzzle } = ctx;
    if (!controls) return '';
    const size = blastSize(puzzle.width, puzzle.height);
    const blast = pickBlast(controls.game.board, puzzle.solution, size);
    if (!blast) return '';
    const { state, washed } = blastInk(ctx.battle(), blast.cells);
    if (washed.length) {
      ctx.saveBattle(state);
      view?.setInk(state.ink ?? [], washed);
    }
    const revealed = controls.game.reveal(blast.cells);
    view?.flashBlast(blast);
    controls.refresh();
    return `The blast reveals ${plural(revealed.length, 'cell')} around row ${blast.row + 1}, column ${blast.col + 1}.`;
  };

  /** Counts a gadget for the run's tally (#107): bombs rule out gold, sponges a mastery badge. */
  const counted = (gadget: Gadget): BattleState => {
    const state = bump(ctx.battle(), 'gadgetsUsed');
    if (gadget.effect.kind === 'blast') return bump(state, 'bombsUsed');
    return gadget.effect.kind === 'wash' ? bump(state, 'spongesUsed') : state;
  };

  const use = (gadget: Gadget) => {
    if (blocker(gadget)) return;
    const inkBefore = ctx.battle().ink ?? [];
    const used = useGadget(counted(gadget), gadget.effect);
    const { state, message } = checkPhase(used.state);
    saveCurrentRun(withBattle(removeGadget(ctx.run(), gadget.id), state));
    if (gadget.effect.kind === 'blast') {
      // At 1 HP there's no damage left to deal, but the reveal still helps.
      if (used.dealt) {
        ctx.bar.setEnemyHp(state.enemyHp);
        ctx.bar.hitEnemy(used.dealt);
      }
      playSound('finisher');
      const hurt = used.dealt
        ? `${ctx.form().name} takes ${used.dealt} damage, ${state.enemyHp} HP left.`
        : '';
      // After what any phase just queued (ink aims for your marks, swaps eat them), so a
      // phase the bomb starts can't undo the blast.
      window.setTimeout(() => {
        const revealed = explode();
        ctx.bar.say([`${gadget.name}!`, hurt, revealed, message].filter(Boolean).join(' '));
      }, 0);
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
