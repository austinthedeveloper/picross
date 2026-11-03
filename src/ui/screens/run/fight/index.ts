import { debug } from '../../../../debug/hooks';
import { finish, useGadget, type Enemy } from '../../../../game/battle';
import type { Puzzle } from '../../../../puzzles/format';
import type { PlaySession } from '../../gameScreen';
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

/**
 * Fight rules on top of a run encounter (#27): completed lines chip the enemy,
 * the solved picture is the finisher, and in Hits-on runs each wrong fill lets
 * the enemy hit your run HP. Each mechanic lives in its own module: line
 * effects (fog, scramble, armor, ink), phases, swaps, forged clues, the charge
 * meter, gadgets, hits, and the finisher. This wires them into the play session's hooks.
 */
export function fightHooks(enemy: Enemy, puzzle: Puzzle) {
  const ctx = createFightContext(enemy, puzzle);
  const swapper = createSwapper(ctx);
  const inker = createInker(ctx);
  const tips = createTips(ctx);
  const checkPhase = createPhases(ctx, swapper, inker, tips.phase);
  // The call-out button sits in the gadget tray, and calling out refreshes the tray.
  const callOut = createCallOut(ctx, checkPhase, () => gadgets.render());
  const gadgets = createGadgetTray(ctx, checkPhase, callOut.buttons);
  const charge = createCharge(ctx, () => gadgets.render());
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
      showLineEffects(ctx, view);
      callOut.show();
      inker.show();
      charge.start();
      tips.start();
    },
    // A bomb can't help once the enemy is down to 1 HP, so damage refreshes the gadgets.
    // A line showing a forgery doesn't count until the forgery is called out.
    onLinesComplete(lines) {
      const counted = lines.filter((line) => !callOut.isFaked(line));
      if (counted.length) charge.drain();
      return completeLines(ctx, counted, checkPhase, gadgets.render);
    },
    onMistake: () => takeHit(ctx, gadgets.render),
    ended: () => knockedOut(ctx),
    celebrate: (board) => playFinisher(ctx, board, finisher),
  };

  if (import.meta.env.VITE_DEBUG === '1') {
    const damage = (amount: number) => {
      const used = useGadget(ctx.battle(), { kind: 'damage', amount });
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
