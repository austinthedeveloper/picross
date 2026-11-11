import { debug } from '@picross/grid/debug/hooks';
import { finish, type Enemy } from '../../../../game/battle';
import type { Later } from '../../../../game/fight';
import type { Puzzle } from '@picross/grid/puzzles/format';
import type { PlaySession } from '@picross/play-grid/ui/screens/gameScreen';
import { createArmorBack } from './armorBack';
import { createCallOut } from './callOut';
import { createCharge } from './charge';
import { createFightContext } from './context';
import { playFinisher } from './finisher';
import { createGadgetTray } from './gadgets';
import { hitOf, knockedOut, takeHit } from './hits';
import { createInker } from './ink';
import { createLines, showLineEffects } from './lines';
import { createPhases } from './phases';
import { createSwapper } from './swaps';
import { createTips } from './tips';
import { createTurner } from './turns';

/**
 * Fight rules on top of a run encounter (#27): completed lines chip the enemy,
 * the solved picture is the finisher, and in Hits-on runs each wrong fill lets
 * the enemy hit your run HP. The rules are `gridStep` (`game/fight.ts`); each
 * mechanic's showing and timing lives in its own module: line effects (fog, scramble,
 * armor, ink), phases, swaps, forged clues, the charge meter, turns, gadgets, hits, and
 * the finisher. This wires them into the play session's hooks.
 */
export function fightHooks(enemy: Enemy, puzzle: Puzzle, onBlock?: () => void) {
  const ctx = createFightContext(enemy, puzzle, onBlock);
  const swapper = createSwapper(ctx);
  const inker = createInker(ctx);
  const tips = createTips(ctx);
  const showPhase = createPhases(ctx, tips.phase);
  /** Runs what a step said waits, at its moment (`Later` in game/fight.ts). */
  const later = (e: Later) => {
    // A phase's: once its new state is saved, it may start the charge or fog the live
    // line, or start or change the turn's count.
    if (e.do === 'aim') window.setTimeout(charge.sync, 0);
    else if (e.do === 'sync-turn') window.setTimeout(turner.sync, 0);
    else if (e.do === 'swap') swapper.queue(e.count);
    else if (e.do === 'ink') inker.later(e.splashes);
    else if (e.do === 'zap') charge.zapLater();
    else if (e.do === 'hit-back') armorBack.hitLater();
    else if (e.do === 'turn') turner.turnLater();
    // The gadget tray throws its own bomb ('blast').
  };
  // The call-out button sits in the gadget tray, and calling out refreshes the tray.
  const callOut = createCallOut(ctx, showPhase, later, () => gadgets.render());
  const gadgets = createGadgetTray(ctx, showPhase, later, callOut.buttons);
  const charge = createCharge(ctx, () => gadgets.render());
  const armorBack = createArmorBack(ctx, () => gadgets.render());
  // After a turn (#83), everything on the board's clues and cells goes back on, turned.
  const turner = createTurner(ctx, () => {
    if (!ctx.view) return;
    showLineEffects(ctx, ctx.view);
    callOut.show();
    inker.show();
    charge.sync();
  });
  const finishLines = createLines(ctx, {
    showPhase,
    later,
    onDamage: () => gadgets.render(),
    armorMeter: armorBack.draw,
    turnMeter: turner.draw,
    charge: charge.finished,
  });
  let finisher = 0;
  let defeatedAs = enemy.name;

  const hooks: Pick<
    PlaySession,
    'header' | 'onBoard' | 'onLinesComplete' | 'onMistake' | 'ended' | 'celebrate'
  > = {
    header: ctx.bar.root,
    onBoard(view, controls) {
      ctx.view = view;
      ctx.controls = controls;
      swapper.attach(view.root);
      turner.attach(view.root);
      showLineEffects(ctx, view);
      callOut.show();
      inker.show();
      charge.sync();
      armorBack.draw();
      turner.sync();
      tips.start();
    },
    // Lines the board reports finished; a forgery doesn't count until it's called out.
    onLinesComplete: (lines) => finishLines(lines),
    onMistake() {
      // The step counts the wrong fill; zaps and wrong accusations count their own.
      const { state, events } = ctx.step({ kind: 'mistake' });
      ctx.saveBattle(state);
      return takeHit(ctx, gadgets.render, undefined, hitOf(events));
    },
    ended: () => knockedOut(ctx),
    celebrate: (board) => playFinisher(ctx, board, finisher),
  };

  if (import.meta.env.VITE_DEBUG === '1') {
    const damage = (amount: number) => {
      const { state, events } = ctx.step({ kind: 'damage', amount });
      let message = '';
      let dealt = 0;
      for (const e of events) {
        if (e.kind === 'phase') message = showPhase(e);
        else if (e.kind === 'later') later(e);
        else if (e.kind === 'damaged') dealt = e.dealt;
      }
      ctx.saveBattle(state);
      ctx.bar.setEnemyHp(state.enemyHp);
      ctx.bar.hitEnemy(dealt);
      gadgets.render();
      ctx.bar.say(`Debug: ${dealt} damage, ${state.enemyHp} HP left. ${message}`);
    };
    debug.fight = {
      damage,
      nextPhase() {
        const next = enemy.phases?.[ctx.battle().phase ?? 0];
        if (next) damage(Math.max(1, ctx.battle().enemyHp - Math.floor(next.at * enemy.hp)));
      },
    };
  }

  return {
    hooks,
    /** The puzzle as the board stands when the fight opens: turned, if it has turned (#83). */
    puzzle: ctx.puzzle,
    /** The enemy's name when the finisher landed (after any phases), for the defeat note. */
    name: () => defeatedAs,
    /** Records the finisher; call from `complete` before the encounter is cleared. */
    land(): number {
      ctx.finished = true;
      defeatedAs = ctx.form().name; // before the encounter is cleared and the battle reset
      finisher = finish(ctx.battle()).dealt;
      gadgets.render();
      return finisher;
    },
  };
}
