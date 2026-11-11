import { pickInk } from '../../../../engine/ink';
import { playSound } from '../../../sound';
import type { FightContext } from './context';

/**
 * Ink (#67): a phase splashes blocks of ink over your marks. Inked cells hide
 * what's under them; completing a line through the ink washes it (see
 * `completeLines`), and a sponge wipes it all.
 */
export function createInker(ctx: FightContext) {
  return {
    /** Shows the battle's ink when the board first appears. */
    show() {
      ctx.view?.setInk(ctx.battle().ink ?? []);
    },
    /** Splashes `count` blocks `size` cells across. Returns how many cells got inked. */
    splash(size: number, count = 1): number {
      if (!ctx.controls) return 0;
      const state = ctx.battle();
      const done = {
        rows: state.struck.filter((k) => k[0] === 'r').map((k) => Number(k.slice(1))),
        cols: state.struck.filter((k) => k[0] === 'c').map((k) => Number(k.slice(1))),
      };
      let ink = state.ink ?? [];
      for (let n = 0; n < count; n++) {
        ink = [...ink, ...pickInk(ctx.controls.game.board, size, ink, done)];
      }
      const added = ink.length - (state.ink?.length ?? 0);
      if (!added) return 0;
      ctx.saveBattle({ ...state, ink });
      ctx.view?.setInk(ink);
      playSound('phase');
      return added;
    },
  };
}

export type Inker = ReturnType<typeof createInker>;
