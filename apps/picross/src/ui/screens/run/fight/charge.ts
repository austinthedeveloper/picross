import type { Line } from '@picross/grid/engine/lines';
import type { ChargeEvent } from '../../../../game/fight';
import { lineName } from '@picross/play-grid/ui/format';
import { haptic } from '@picross/shared/ui/haptics';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';
import { hitOf, takeHit } from './hits';

/**
 * The charge meter (#67, the Electric Eel). One line is live ⚡. Finish it and you
 * ground the charge; finish `form().charge` other lines first and the enemy zaps you
 * (Hits-on runs). Either way another line goes live. It only moves when you finish a
 * line, never with time, because working a line out is the game. It warms up first:
 * no line is live until you've finished a quarter of the board, so the opening is
 * free and the first live line is one you're already into. `gridStep` keeps the meter;
 * this shows it and lands the zap.
 */
export function createCharge(ctx: FightContext, onKnockout: () => void) {
  const zap = () => {
    if (ctx.finished || ctx.run()?.status !== 'active') return;
    ctx.bar.zap();
    playSound('zap');
    haptic('zap');
    const { name } = ctx.form();
    const { state, events } = ctx.step({ kind: 'zap', hitsOn: ctx.hitsOn });
    if (ctx.hitsOn) ctx.saveBattle(state);
    const message = ctx.hitsOn
      ? takeHit(ctx, onKnockout, `⚡ ${name} zaps you!`, hitOf(events))
      : `⚡ ${name} zaps the board. It fizzles in a Relaxed run.`;
    ctx.controls?.refresh();
    ctx.bar.say(message);
  };

  /** Shows the meter and the live line as the charge aimed them. */
  const show = (e: ChargeEvent) => {
    if (!e.limit) {
      ctx.bar.setCharge(null);
      ctx.view?.setLive(null);
    } else if (e.warmUp) {
      const n = e.warmUp;
      ctx.bar.setCharge(0, `Warming up · ${n} ${n === 1 ? 'line' : 'lines'}`);
      ctx.view?.setLive(null);
    } else {
      const left = `${e.limit - e.charged} left`;
      ctx.bar.setCharge(e.charged / e.limit, e.live ? `${lineName(e.live, true)} · ${left}` : left);
      ctx.view?.setLive(e.live);
    }
  };

  const liveNow = (line: Line | null) => (line ? `⚡ ${lineName(line, true)} is live.` : '');

  return {
    /** Shows the meter once the board is up, and after a phase, which may start the charge or fog the live line. */
    sync() {
      const step = ctx.controls ? ctx.step({ kind: 'aim', board: ctx.controls.game.board }) : null;
      if (step?.changed) ctx.saveBattle(step.state);
      const aimed = step?.events.find((e) => e.kind === 'charge');
      show(
        aimed ?? {
          kind: 'charge',
          limit: null,
          warmUp: 0,
          charged: 0,
          live: null,
          fresh: null,
          warming: false,
        },
      );
      if (!aimed?.fresh) return;
      ctx.bar.say(liveNow(aimed.fresh));
      playSound('live', 0.6); // after the phase's own sound
    },
    /**
     * The meter after lines you just finished. `grounded` and `zapped` say whether they
     * grounded it or charged it to a zap. Returns the announcement.
     */
    finished(e: ChargeEvent, grounded: boolean, zapped: boolean): string {
      show(e);
      // A new live line sounds after the line chime, or after grounding or the zap.
      if (e.fresh) playSound(e.warming ? 'charged' : 'live', grounded || zapped ? 0.5 : 0.15);
      return [grounded ? '⚡ Grounded! The charge drains away.' : '', liveNow(e.fresh)]
        .filter(Boolean)
        .join(' ');
    },
    /** Like ink and swaps, the zap lands outside the redraw that triggered it. */
    zapLater() {
      window.setTimeout(zap, 0);
    },
  };
}
