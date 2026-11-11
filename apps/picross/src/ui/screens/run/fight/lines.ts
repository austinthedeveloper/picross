import type { ChargeEvent, Later } from '../../../../game/fight';
import { lineCount, type Line } from '@picross/grid/engine/lines';
import type { BoardView } from '@picross/play-grid/ui/board/boardView';
import { lineName } from '@picross/play-grid/ui/format';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';
import type { ShowPhase } from './phases';

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

/** What finished lines show besides their own effects: the meters and what waits. */
export interface LineEffects {
  showPhase: ShowPhase;
  later: (e: Later) => void;
  /** Gadgets refresh when damage lands. */
  onDamage: () => void;
  armorMeter: () => void;
  turnMeter: () => void;
  charge: (e: ChargeEvent, grounded: boolean, zapped: boolean) => string;
}

/**
 * Everything that happens when the board reports lines complete (`gridStep`): fog lifts
 * (#30), ink washes off (#67), scrambles restore (#49), chip damage lands or armor takes
 * it (#50), phases may start (#42), and the armor's, the turn's and the charge's meters
 * move. Saves the battle and returns the announcement, if any.
 */
export function createLines(ctx: FightContext, effects: LineEffects) {
  return function finished(lines: Line[]): string | undefined {
    const { bar, view } = ctx;
    const { state, events } = ctx.step({ kind: 'lines', lines, board: ctx.controls?.game.board });
    const messages: string[] = [];
    let phase = '';
    let grounded = false;
    let zapped = false;
    let charge = '';
    for (const e of events) {
      switch (e.kind) {
        case 'cracked':
          view?.setWeakPoints(e.armor, e.lines);
          bar.setArmor(lineCount(e.armor));
          if (e.broke) bar.armorBreaks();
          break;
        case 'phase':
          phase = effects.showPhase(e);
          break;
        case 'later':
          if (e.do === 'zap') zapped = true;
          effects.later(e);
          break;
        case 'fog-lifted':
          view?.setFog(e.fog, e.lines);
          messages.push(`You solved through the fog: ${names(e.lines)} revealed.`);
          break;
        case 'refilled':
          view?.setWiped(e.wiped);
          break;
        case 'honest': {
          view?.setSuspects(e.suspects);
          const verb = e.lines.length > 1 ? 'check' : 'checks';
          const which = e.lines.map((l, i) => lineName(l, i === 0)).join(', ');
          messages.push(`${which} ${verb} out: honest.`);
          break;
        }
        case 'washed':
          view?.setInk(e.ink, e.cells);
          messages.push('The ink washes away.');
          break;
        case 'unscrambled':
          view?.setScramble(e.scramble, e.lines);
          messages.push(`Gears click back into place: ${names(e.lines)} in order.`);
          break;
        case 'chip':
          // Saved once the lines' own effects show, before the damage and the meters.
          if (state !== ctx.battle()) ctx.saveBattle(state);
          if (e.dealt) {
            bar.setEnemyHp(e.hp);
            bar.hitEnemy(e.dealt);
            playSound('strike');
            effects.onDamage();
            messages.unshift(`${ctx.enemy.name} takes ${e.dealt} damage, ${e.hp} HP left.`);
          }
          if (e.cracked) messages.push('Weak point! Triple damage.');
          if (e.broke) messages.push(`${ctx.form().name}'s armor breaks! Its hits soften.`);
          else if (!e.dealt && e.lines && e.armored) {
            messages.push('The armor shrugs it off. Find the 🎯 weak points before it hits back.');
          }
          if (phase) messages.push(phase);
          break;
        case 'armor-meter':
          effects.armorMeter();
          break;
        case 'turn-meter':
          effects.turnMeter();
          break;
        case 'grounded':
          grounded = true;
          playSound('phase');
          break;
        case 'charge':
          charge = effects.charge(e, grounded, zapped);
          break;
      }
    }
    return [messages.join(' '), charge].filter(Boolean).join(' ') || undefined;
  };
}

const names = (lines: Line[]) => lines.map((l) => lineName(l)).join(', ');
