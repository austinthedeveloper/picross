import type { FightContext } from './context';
import { takeHit } from './hits';

const TICK_MS = 250;

/**
 * The charge meter (#67, the Electric Eel): it fills over `form().charge`
 * seconds and drains whenever you complete a line. If it fills, the enemy zaps
 * you (Hits-on runs) and it starts over. It pauses while the page is hidden and
 * stops once the fight is over or you've left the screen.
 */
export function createCharge(ctx: FightContext, onKnockout: () => void) {
  let elapsed = 0;
  let timer = 0;

  const over = () =>
    ctx.finished ||
    ctx.run()?.status !== 'active' ||
    Boolean(ctx.controls?.game.solved || ctx.controls?.game.failed);

  const zap = () => {
    elapsed = 0;
    ctx.bar.zap();
    const { name } = ctx.form();
    const message = ctx.hitsOn
      ? takeHit(ctx, onKnockout, `⚡ ${name} zaps you!`)
      : `⚡ ${name} zaps the board. It fizzles in a Relaxed run.`;
    ctx.controls?.refresh();
    ctx.bar.say(message);
  };

  const tick = () => {
    if (!ctx.view?.root.isConnected || over()) {
      window.clearInterval(timer);
      ctx.bar.setCharge(null);
      return;
    }
    const seconds = ctx.form().charge;
    if (!seconds) return ctx.bar.setCharge(null);
    if (document.hidden) return;
    elapsed += TICK_MS / 1000;
    ctx.bar.setCharge(elapsed / seconds);
    if (elapsed >= seconds) zap();
  };

  return {
    /** Starts the meter once the board is up. */
    start() {
      timer = window.setInterval(tick, TICK_MS);
      ctx.bar.setCharge(ctx.form().charge ? 0 : null);
    },
    /** A completed line drains the meter. */
    drain() {
      elapsed = 0;
      if (ctx.form().charge) ctx.bar.setCharge(0);
    },
  };
}
