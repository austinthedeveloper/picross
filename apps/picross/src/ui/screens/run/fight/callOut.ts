import type { Later } from '../../../../game/fight';
import { keyToLine, lineKey } from '@picross/grid/engine/lines';
import { fakeClues } from '@picross/grid/engine/fakes';
import { lineCount, noLines, type Line, type LineSet } from '@picross/grid/engine/lines';
import { turnClue, turnLines } from '@picross/grid/engine/transform';
import { withArt } from '@picross/shared/ui/art';
import { el } from '@picross/shared/ui/dom';
import { lineName } from '@picross/play-grid/ui/format';
import { haptic } from '@picross/shared/ui/haptics';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';
import { takeHit } from './hits';
import type { ShowPhase } from './phases';

/**
 * Forged clues (#64). The Forger marks some clues 🎭: they might be forged, and
 * some are. Solve those lines from the ones crossing them. An honest suspect
 * lights up and loses its 🎭 (`completeLines`); a forged one never counts as
 * complete, so it stays dark. Tap "Call out", then the 🎭 clue: a forgery is
 * unmasked for call-out damage, but accusing an honest one lets the enemy hit you
 * (or, in a Relaxed run, heal). `gridStep` judges the accusation; this shows it.
 */
export function createCallOut(
  ctx: FightContext,
  showPhase: ShowPhase,
  later: (e: Later) => void,
  onChange: () => void,
) {
  let picking = false;
  const fakes = () => ctx.battle().fakes ?? noLines();
  /**
   * The forgeries on show. They're forged from the clues as drawn and then turned
   * with the board (#83), so a turn moves a forgery but never changes it.
   */
  const shown = (set: LineSet) => {
    const { width, height, clues } = ctx.drawn;
    const turns = ctx.battle().turns ?? 0;
    const drawn = fakeClues(width, height, clues, turnLines(set, width, -turns));
    return new Map(
      [...drawn].map(([key, clue]) => {
        const turned = turnClue(keyToLine(key), clue, width, turns);
        return [lineKey(turned.line.kind, turned.line.index), turned.clue] as const;
      }),
    );
  };

  const stopPicking = () => {
    picking = false;
    ctx.view?.pickClue(null);
  };

  const suspects = () => ctx.battle().suspects ?? noLines();

  const accuse = (line: Line) => {
    const name = lineName(line, true);
    const { state, events } = ctx.step({ kind: 'call-out', line, hitsOn: ctx.hitsOn });
    // Only 🎭 clues can be forged: tapping any other just says so and keeps picking.
    if (events[0]?.kind === 'not-suspect') {
      ctx.bar.say(`${name} isn't a suspect. Pick a 🎭 clue, or tap Call out again to cancel.`);
      return;
    }
    stopPicking();
    let message = '';
    let phase = '';
    for (const e of events) {
      switch (e.kind) {
        case 'phase':
          phase = showPhase(e);
          break;
        case 'later':
          later(e);
          break;
        case 'caught':
          ctx.saveBattle(state);
          ctx.view?.setFakes(shown(state.fakes ?? noLines()), [line]);
          ctx.view?.setSuspects(state.suspects ?? noLines());
          ctx.bar.setFakes(lineCount(state.fakes ?? noLines()));
          ctx.bar.setEnemyHp(e.hp);
          ctx.bar.hitEnemy(e.dealt);
          playSound('strike');
          message = `Caught it! ${name} was a forgery. ${ctx.form().name} takes ${e.dealt} damage, ${e.hp} HP left. ${phase}`;
          break;
        case 'accused':
          ctx.saveBattle(state);
          ctx.view?.setSuspects(state.suspects ?? noLines());
          playSound('hit');
          haptic('hit');
          break;
        case 'hit':
        case 'blocked':
          message = takeHit(ctx, onChange, `${name} was honest!`, e);
          break;
        case 'healed':
          ctx.view?.setSuspects(state.suspects ?? noLines());
          ctx.saveBattle(state);
          ctx.bar.setEnemyHp(e.hp);
          message = `${name} was honest. ${ctx.form().name} touches up ${e.amount} HP.`;
          break;
      }
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
      ctx.bar.say('Tap the 🎭 clue you think is forged.');
    }
    onChange();
  };

  return {
    /** Shows the forgeries when the board first appears, and again after it turns (#83). */
    show() {
      if (!ctx.battle().fakes) return;
      ctx.view?.setFakes(shown(fakes()));
      ctx.view?.setSuspects(suspects());
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
        el('span', { className: 'gadget-icon', ariaHidden: 'true' }, withArt('🔍')),
        picking ? 'Pick a clue…' : 'Call out',
      );
      return [button];
    },
  };
}
