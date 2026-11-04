import { advancePhase, currentForm, type BattleState } from '../../../../game/battle';
import { lineCount, type LineSet } from '../../../../engine/lines';
import { playSound } from '../../../sound';
import type { FightContext } from './context';
import { phasePowers } from '../../../../puzzles/enemies';
import type { Inker } from './ink';
import type { Swapper } from './swaps';

/**
 * Boss phases (#42): after any damage, starts the phases the enemy's HP has
 * fallen into. Each can change its form, attack, and charge, fog or scramble more
 * lines, swap lines, and splash ink. Returns the new state and a message to announce.
 */
export function createPhases(
  ctx: FightContext,
  swapper: Swapper,
  inker: Inker,
  /** Called with the powers new phases bring in, for their tips (#79). */
  onPowers: (powers: ReturnType<typeof phasePowers>) => void = () => {},
) {
  return function checkPhase(state: BattleState): { state: BattleState; message: string } {
    const { state: next, entered } = advancePhase(ctx.enemy, state);
    if (!entered.length) return { state, message: '' };
    const before = currentForm(ctx.enemy, state).name;
    const { name, sprite } = currentForm(ctx.enemy, next);
    onPowers(entered.flatMap(phasePowers));
    const swaps = entered.filter((p) => p.swap).length;
    if (swaps) swapper.queue(swaps);
    // Ink lands after the new state is saved, so it isn't lost to the save.
    const splashes = entered.filter((p) => p.ink);
    if (splashes.length) {
      window.setTimeout(() => {
        const inked = splashes.reduce((n, p) => n + inker.splash(p.ink!, p.inkCount), 0);
        if (inked) ctx.bar.say(`${ctx.form().name} squirts ink! ${inked} cells go dark.`);
      }, 0);
    }
    const taunt = entered
      .map((p) => p.taunt)
      .filter(Boolean)
      .join(' ');
    ctx.bar.setForm(name, sprite);
    ctx.bar.phaseBanner(name, taunt);
    if (next.fog) ctx.view?.setFog(next.fog);
    if (next.scramble) ctx.view?.setScramble(next.scramble);
    playSound('phase');
    const added = (key: 'fog' | 'scramble') => count(next[key]) - count(state[key]);
    const parts = [
      name !== before ? `${before} becomes ${name}!` : '',
      taunt,
      added('fog') > 0 ? `${added('fog')} lines go dark.` : '',
      added('scramble') > 0 ? `${added('scramble')} clues scramble.` : '',
      entered.some((p) => p.charge) ? 'The air starts to crackle. ⚡' : '',
    ];
    return { state: next, message: parts.filter(Boolean).join(' ') };
  };
}

const count = (set?: LineSet) => (set ? lineCount(set) : 0);

export type CheckPhase = ReturnType<typeof createPhases>;
