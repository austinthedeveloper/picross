import { finish, type Enemy } from '../../../../game/battle';
import type { Puzzle } from '../../../../puzzles/format';
import type { PlaySession } from '../../gameScreen';
import { createFightContext } from './context';
import { playFinisher } from './finisher';
import { createGadgetTray } from './gadgets';
import { knockedOut, takeHit } from './hits';
import { completeLines, showLineEffects } from './lines';
import { createPhases } from './phases';
import { createSwapper } from './swaps';

/**
 * Fight rules on top of a run encounter (#27): completed lines chip the enemy,
 * the solved picture is the finisher, and in Hits-on runs each wrong fill lets
 * the enemy hit your run HP. Each mechanic lives in its own module: line
 * effects (fog, scramble, armor), phases, swaps, gadgets, hits, and the
 * finisher. This wires them into the play session's hooks.
 */
export function fightHooks(enemy: Enemy, puzzle: Puzzle) {
  const ctx = createFightContext(enemy, puzzle);
  const swapper = createSwapper(ctx);
  const checkPhase = createPhases(ctx, swapper);
  const gadgets = createGadgetTray(ctx, checkPhase);
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
    },
    // A bomb can't help once the enemy is down to 1 HP, so damage refreshes the gadgets.
    onLinesComplete: (lines) => completeLines(ctx, lines, checkPhase, gadgets.render),
    onMistake: () => takeHit(ctx, gadgets.render),
    ended: () => knockedOut(ctx),
    celebrate: (board) => playFinisher(ctx, board, finisher),
  };

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
