import {
  chip,
  clearFog,
  clearInk,
  clearScramble,
  clearSuspects,
  clearWiped,
  type BattleState,
} from '../../../../game/battle';
import { keyToLine, lineCount, lineKey, noLines, type Line } from '../../../../engine/lines';
import type { BoardView } from '../../../board/boardView';
import { lineName } from '../../../format';
import { playSound } from '../../../sound';
import type { FightContext } from './context';
import type { CheckPhase } from './phases';

/** Shows the battle's fog, scramble, and weak points when the board first appears. */
export function showLineEffects(ctx: FightContext, view: BoardView) {
  const { fog, scramble, armor } = ctx.battle();
  if (fog) view.setFog(fog);
  if (ctx.battle().wiped) view.setWiped(ctx.battle().wiped!);
  if (scramble) view.setScramble(scramble);
  if (armor) {
    view.setWeakPoints(armor);
    ctx.bar.setArmor(lineCount(armor));
  }
}

/**
 * Everything that happens when lines are completed: fog lifts (#30), ink washes
 * off (#67), scrambles restore (#49), chip damage lands or armor takes it (#50), and phases may
 * start (#42). Saves the battle and returns the announcement, if any.
 */
export function completeLines(
  ctx: FightContext,
  lines: Line[],
  checkPhase: CheckPhase,
  onDamage: () => void,
): string | undefined {
  const { bar, view } = ctx;
  const fogged = clearFog(ctx.battle(), lines);
  const washedOut = clearInk(fogged.state, lines, ctx.puzzle.width);
  const refilled = clearWiped(washedOut.state, lines);
  // A suspect that completes showed its real clue all along: it was honest.
  const cleared = clearSuspects(refilled.state, lines);
  const unscrambled = clearScramble(cleared.state, lines);
  const chipped = chip(
    unscrambled.state,
    lines.map((l) => lineKey(l.kind, l.index)),
  );
  if (chipped.cracked.length || chipped.broke) {
    const armor = chipped.state.armor ?? noLines();
    view?.setWeakPoints(armor, chipped.cracked.map(keyToLine));
    bar.setArmor(lineCount(armor));
    if (chipped.broke) bar.armorBreaks();
  }
  const phased = checkPhase(chipped.state);
  const state: BattleState = phased.state;

  const messages: string[] = [];
  if (fogged.revealed.length && state.fog) {
    view?.setFog(state.fog, fogged.revealed);
    messages.push(`You solved through the fog: ${names(fogged.revealed)} revealed.`);
  }
  if (refilled.revealed.length) view?.setWiped(state.wiped ?? noLines());
  if (cleared.revealed.length) {
    view?.setSuspects(state.suspects ?? noLines());
    const verb = cleared.revealed.length > 1 ? 'check' : 'checks';
    const which = cleared.revealed.map((l, i) => lineName(l, i === 0)).join(', ');
    messages.push(`${which} ${verb} out: honest.`);
  }
  if (washedOut.washed.length) {
    view?.setInk(state.ink ?? [], washedOut.washed);
    messages.push('The ink washes away.');
  }
  if (unscrambled.revealed.length && state.scramble) {
    view?.setScramble(state.scramble, unscrambled.revealed);
    messages.push(`Gears click back into place: ${names(unscrambled.revealed)} in order.`);
  }
  if (state !== ctx.battle()) ctx.saveBattle(state);
  if (chipped.dealt) {
    bar.setEnemyHp(state.enemyHp);
    bar.hitEnemy(chipped.dealt);
    playSound('strike');
    onDamage();
    messages.unshift(`${ctx.enemy.name} takes ${chipped.dealt} damage, ${state.enemyHp} HP left.`);
  }
  if (chipped.cracked.length) messages.push('Weak point! Triple damage.');
  if (chipped.broke) messages.push(`${ctx.form().name}'s armor breaks! Its hits soften.`);
  else if (!chipped.dealt && lines.length && ctx.form().armored) {
    messages.push('The armor shrugs it off. Find the 🎯 weak points before it hits back.');
  }
  if (phased.message) messages.push(phased.message);
  return messages.join(' ') || undefined;
}

const names = (lines: Line[]) => lines.map((l) => lineName(l)).join(', ');
