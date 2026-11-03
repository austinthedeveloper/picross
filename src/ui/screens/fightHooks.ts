import { chip, finish, lineKey, startBattle, type Enemy } from '../../game/battle';
import { damage, withBattle, type RunState } from '../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../game/runSave';
import type { Puzzle } from '../../puzzles/format';
import { createPicture } from '../board/picture';
import { createBattleBar } from '../components/battleBar';
import { el } from '../dom';
import { playSound } from '../sound';
import type { PlaySession } from './gameScreen';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Fight rules on top of a run encounter (#27): completed lines chip the
 * enemy, the solved picture is the finisher, and in Hearts runs each wrong
 * fill lets the enemy hit the player's run HP. Every change is saved to the
 * run right away so a reload resumes the fight.
 */
export function fightHooks(enemy: Enemy, puzzle: Puzzle) {
  const current = (): RunState => getCurrentRun()!;
  const battle = () => current().battle ?? startBattle(enemy);

  const bar = createBattleBar(enemy, battle().enemyHp);
  bar.setPlayerHp(current().hp, current().maxHp);
  let finisher = 0;

  const hooks: Pick<
    PlaySession,
    'header' | 'onLinesComplete' | 'onMistake' | 'ended' | 'celebrate'
  > = {
    header: bar.root,

    onLinesComplete(lines) {
      const { state, dealt } = chip(
        battle(),
        lines.map((l) => lineKey(l.kind, l.index)),
      );
      if (!dealt) return;
      saveCurrentRun(withBattle(current(), state));
      bar.setEnemyHp(state.enemyHp);
      bar.hitEnemy(dealt);
      playSound('strike');
      return `${enemy.name} takes ${dealt} damage, ${state.enemyHp} HP left.`;
    },

    onMistake() {
      const run = damage(current(), enemy.attack);
      saveCurrentRun(run);
      bar.setPlayerHp(run.hp, run.maxHp);
      bar.hitPlayer(enemy.attack);
      return run.status === 'lost'
        ? `${enemy.name} hits you for ${enemy.attack}. You're knocked out.`
        : `Wrong cell! ${enemy.name} hits you for ${enemy.attack}. ${run.hp} HP left.`;
    },

    ended() {
      if (current()?.status !== 'lost') return null;
      return {
        title: 'Knocked out',
        note: `${enemy.name} wins this round. The run is over.`,
        actions: [
          el('a', { className: 'button primary', href: '#/run', textContent: 'See results →' }),
        ],
      };
    },

    // The solved picture flies at the enemy and lands the finisher.
    async celebrate(board) {
      bar.setEnemyHp(0);
      const picture = createPicture(puzzle.solution, 6);
      picture.classList.add('projectile');
      document.body.append(picture);
      const from = board.getBoundingClientRect();
      const to = bar.sprite.getBoundingClientRect();
      const size = picture.getBoundingClientRect();
      const start = `translate(${from.left + from.width / 2 - size.width / 2}px, ${from.top + from.height / 2 - size.height / 2}px)`;
      const end = `translate(${to.left + to.width / 2 - size.width / 2}px, ${to.top + to.height / 2 - size.height / 2}px)`;
      if (!reducedMotion()) {
        await picture.animate(
          [
            { transform: `${start} scale(2)`, opacity: 1 },
            { transform: `${start} scale(2.3) rotate(-20deg)`, offset: 0.25 },
            { transform: `${end} scale(0.6) rotate(25deg)`, opacity: 1 },
          ],
          { duration: 650, easing: 'cubic-bezier(.5,0,.75,0)' },
        ).finished;
      }
      picture.remove();
      playSound('finisher');
      bar.hitEnemy(finisher);
      bar.defeat();
      if (!reducedMotion()) await wait(600);
    },
  };

  return {
    hooks,
    /** Records the finisher; call from `complete` before the encounter is cleared. */
    land(): number {
      finisher = finish(battle()).dealt;
      return finisher;
    },
  };
}
