import { createPicture } from '../../../board/picture';
import { pause, reducedMotion } from '@picross/shared/ui/motion';
import { playSound } from '@picross/shared/ui/sound';
import type { FightContext } from './context';

/** The solved picture flies from the board at the enemy and lands the finisher. */
export async function playFinisher(ctx: FightContext, board: HTMLElement, damage: number) {
  const { bar } = ctx;
  bar.setEnemyHp(0);
  const picture = createPicture(ctx.puzzle.solution, 6);
  picture.classList.add('projectile');
  document.body.append(picture);
  const from = board.getBoundingClientRect();
  const to = bar.sprite.getBoundingClientRect();
  const size = picture.getBoundingClientRect();
  const at = (rect: DOMRect) =>
    `translate(${rect.left + rect.width / 2 - size.width / 2}px, ${rect.top + rect.height / 2 - size.height / 2}px)`;
  if (!reducedMotion()) {
    await picture.animate(
      [
        { transform: `${at(from)} scale(2)`, opacity: 1 },
        { transform: `${at(from)} scale(2.3) rotate(-20deg)`, offset: 0.25 },
        { transform: `${at(to)} scale(0.6) rotate(25deg)`, opacity: 1 },
      ],
      { duration: 650, easing: 'cubic-bezier(.5,0,.75,0)' },
    ).finished;
  }
  picture.remove();
  playSound('finisher');
  bar.hitEnemy(damage);
  bar.defeat();
  await pause(600);
}
