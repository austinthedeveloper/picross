import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';

/**
 * Ink (#67): a phase splashes blocks of ink over your marks (`gridStep` picks where).
 * Inked cells hide what's under them; completing a line through the ink washes it, and
 * a sponge wipes it all.
 */
export function createInker(ctx: FightContext) {
  /** Splashes `count` blocks `size` cells across. Returns how many cells got inked. */
  const splash = (size: number, count?: number): number => {
    if (!ctx.controls) return 0;
    const { state, events } = ctx.step({
      kind: 'ink',
      size,
      count,
      board: ctx.controls.game.board,
    });
    const inked = events.find((e) => e.kind === 'inked');
    if (!inked) return 0;
    ctx.saveBattle(state);
    ctx.view?.setInk(inked.ink);
    playSound('phase');
    return inked.added;
  };

  return {
    /** Shows the battle's ink when the board first appears. */
    show() {
      ctx.view?.setInk(ctx.battle().ink ?? []);
    },
    /** A phase's ink, after its new state is saved, so it isn't lost to the save. */
    later(splashes: { size: number; count?: number }[]) {
      window.setTimeout(() => {
        const inked = splashes.reduce((n, p) => n + splash(p.size, p.count), 0);
        if (inked) ctx.bar.say(`${ctx.form().name} squirts ink! ${inked} cells go dark.`);
      }, 0);
    },
  };
}
