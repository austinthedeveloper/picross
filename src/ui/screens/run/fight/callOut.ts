import { callOut, heal } from '../../../../game/battle';
import { fakeClues } from '../../../../engine/fakes';
import { lineCount, noLines, type Line, type LineSet } from '../../../../engine/lines';
import { el } from '../../../dom';
import { lineName } from '../../../format';
import { playSound } from '../../../sound';
import type { FightContext } from './context';
import { takeHit } from './hits';
import type { CheckPhase } from './phases';

/**
 * Forged clues (#64). The Forger shows fake numbers on some lines; a faked line
 * never counts as complete, so a line you've filled correctly that won't light up
 * gives a forgery away. Tap "Call out", then the clue: a forgery is unmasked for
 * call-out damage, but accusing an honest clue lets the enemy hit you (or, in a
 * Relaxed run, heal).
 */
export function createCallOut(ctx: FightContext, checkPhase: CheckPhase, onChange: () => void) {
  let picking = false;
  const fakes = () => ctx.battle().fakes ?? noLines();
  const shown = (set: LineSet) =>
    fakeClues(ctx.puzzle.width, ctx.puzzle.height, ctx.puzzle.clues, set);

  const stopPicking = () => {
    picking = false;
    ctx.view?.pickClue(null);
  };

  const accuse = (line: Line) => {
    stopPicking();
    const name = lineName(line, true);
    const result = callOut(ctx.battle(), line);
    let message: string;
    if (result.caught) {
      const { state, message: phase } = checkPhase(result.state);
      ctx.saveBattle(state);
      ctx.view?.setFakes(shown(state.fakes ?? noLines()), [line]);
      ctx.bar.setFakes(lineCount(state.fakes ?? noLines()));
      ctx.bar.setEnemyHp(state.enemyHp);
      ctx.bar.hitEnemy(result.dealt);
      playSound('strike');
      message = `Caught it! ${name} was a forgery. ${ctx.form().name} takes ${result.dealt} damage, ${state.enemyHp} HP left. ${phase}`;
    } else if (ctx.hitsOn) {
      message = takeHit(ctx, onChange, `${name} was honest!`);
    } else {
      const healed = heal(ctx.battle(), ctx.enemy.hp);
      ctx.saveBattle(healed.state);
      ctx.bar.setEnemyHp(healed.state.enemyHp);
      message = `${name} was honest. ${ctx.form().name} touches up ${healed.healed} HP.`;
    }
    // Redraw: an unmasked line you'd already filled completes now, and a knockout shows.
    ctx.controls?.refresh();
    onChange();
    ctx.bar.say(message.trim());
  };

  const toggle = () => {
    if (picking) {
      stopPicking();
      ctx.bar.say('Call-out cancelled.');
    } else {
      picking = true;
      ctx.view?.pickClue(accuse);
      ctx.bar.say('Tap the clue you think is forged.');
    }
    onChange();
  };

  return {
    /** Shows the forgeries when the board first appears. */
    show() {
      if (!ctx.battle().fakes) return;
      ctx.view?.setFakes(shown(fakes()));
      ctx.bar.setFakes(lineCount(fakes()));
    },
    /** True if a line's clue is a forgery still standing: it doesn't count as complete. */
    isFaked: (line: Line) =>
      (line.kind === 'row' ? fakes().rows : fakes().cols).includes(line.index),
    /** The call-out button, while there are forgeries left. */
    buttons(): HTMLElement[] {
      if (!lineCount(fakes()) || ctx.finished || ctx.run()?.status !== 'active') return [];
      const button = el('button', {
        className: `gadget call-out${picking ? ' active' : ''}`,
        ariaPressed: String(picking),
        title: 'Accuse a clue of being forged',
        onclick: toggle,
      });
      button.append(
        el('span', { className: 'gadget-icon', textContent: '🔍', ariaHidden: 'true' }),
        picking ? 'Pick a clue…' : 'Call out',
      );
      return [button];
    },
  };
}
