import type { PhaseEvent } from '../../../../game/fight';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';
import { phasePowers } from '../../../../puzzles/enemies';

/**
 * Boss phases (#42): shows the phases a step started (`gridStep` starts them after any
 * damage). Each can change the enemy's form and attack, and fog or scramble more lines;
 * what else it brings (swaps, ink, the charge, turns) comes as later events. Returns the
 * message to announce.
 */
export function createPhases(
  ctx: FightContext,
  /** Called with the powers new phases bring in, for their tips (#79). */
  onPowers: (powers: ReturnType<typeof phasePowers>) => void = () => {},
) {
  return function showPhase(e: PhaseEvent): string {
    onPowers(e.entered.flatMap(phasePowers));
    ctx.bar.setForm(e.name, e.sprite);
    ctx.bar.phaseBanner(e.name, e.taunt);
    if (e.fog) ctx.view?.setFog(e.fog);
    if (e.scramble) ctx.view?.setScramble(e.scramble);
    playSound('phase');
    const parts = [
      e.name !== e.before ? `${e.before} becomes ${e.name}!` : '',
      e.taunt,
      e.fogged > 0 ? `${e.fogged} lines go dark.` : '',
      e.scrambled > 0 ? `${e.scrambled} clues scramble.` : '',
      e.entered.some((p) => p.charge) ? 'The air starts to crackle. ⚡' : '',
      e.entered.some((p) => p.rotate) ? 'The wind picks up. 🔃' : '',
    ];
    return parts.filter(Boolean).join(' ');
  };
}

export type ShowPhase = ReturnType<typeof createPhases>;
