import { debug } from '../../../../debug/hooks';
import { lineKey } from '../../../../engine/lines';
import { bump, finish, useGadget, type Enemy } from '../../../../game/battle';
import type { Puzzle } from '../../../../puzzles/format';
import type { PlaySession } from '../../gameScreen';
import { createArmorBack } from './armorBack';
import { createCallOut } from './callOut';
import { createCharge } from './charge';
import { createFightContext } from './context';
import { playFinisher } from './finisher';
import { createGadgetTray } from './gadgets';
import { knockedOut, takeHit } from './hits';
import { createInker } from './ink';
import { completeLines, showLineEffects } from './lines';
import { createPhases } from './phases';
import { createSwapper } from './swaps';
import { createTips } from './tips';
import { createTurner } from './turns';

/**
 * Fight rules on top of a run encounter (#27): completed lines chip the enemy,
 * the solved picture is the finisher, and in Hits-on runs each wrong fill lets
 * the enemy hit your run HP. Each mechanic lives in its own module: line
 * effects (fog, scramble, armor, ink), phases, swaps, forged clues, the charge
 * meter, turns, gadgets, hits, and the finisher. This wires them into the play
 * session's hooks.
 */
export function fightHooks(enemy: Enemy, puzzle: Puzzle, onBlock?: () => void) {
  const ctx = createFightContext(enemy, puzzle, onBlock);
  const swapper = createSwapper(ctx);
  const inker = createInker(ctx);
  const tips = createTips(ctx);
  const checkPhase = createPhases(ctx, swapper, inker, (powers) => {
    tips.phase(powers);
    // Once the phase's new state is saved: it may start the charge or fog the live line.
    window.setTimeout(charge.sync, 0);
    window.setTimeout(turner.sync, 0);
  });
  // The call-out button sits in the gadget tray, and calling out refreshes the tray.
  const callOut = createCallOut(ctx, checkPhase, () => gadgets.render());
  const gadgets = createGadgetTray(ctx, checkPhase, callOut.buttons);
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
      armorBack.show();
      turner.sync();
      tips.start();
    },
    // A line showing a forgery doesn't count until the forgery is called out.
    onLinesComplete(lines) {
      const counted = lines.filter((line) => !callOut.isFaked(line));
      // A refilled line (after a swap, say) has already counted, so it can't charge again.
      const { struck, armor } = ctx.battle();
      const fresh = counted.filter((l) => !struck.includes(lineKey(l.kind, l.index)));
      const message = completeLines(ctx, counted, checkPhase, gadgets.render);
      armorBack.finished(fresh, armor);
      turner.finished(fresh);
      return [message, charge.finished(fresh)].filter(Boolean).join(' ') || undefined;
    },
    onMistake() {
      // Counted here, not in takeHit: zaps and wrong accusations hit too, and a block returns early.
      ctx.saveBattle(bump(ctx.battle(), 'wrongFills'));
      return takeHit(ctx, gadgets.render);
    },
    ended: () => knockedOut(ctx),
    celebrate: (board) => playFinisher(ctx, board, finisher),
  };

  if (import.meta.env.VITE_DEBUG === '1') {
    const damage = (amount: number) => {
      const used = useGadget(ctx.battle(), { kind: 'blast', damage: amount });
      const { state, message } = checkPhase(used.state);
      ctx.saveBattle(state);
      ctx.bar.setEnemyHp(state.enemyHp);
      ctx.bar.hitEnemy(used.dealt);
      gadgets.render();
      ctx.bar.say(`Debug: ${used.dealt} damage, ${state.enemyHp} HP left. ${message}`);
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
