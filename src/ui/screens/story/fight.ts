import { damage, type RunState } from '../../../game/run';
import { getCurrentRun, saveCurrentRun } from '../../../game/runSave';
import type { Encounter } from '../../../story/data';
import { enemyArt } from '../../art';
import { el } from '../../dom';
import { playSound } from '../../sound';
import type { Kind } from './encounter';
import { took } from './encounter';

/**
 * A fight. With Hits on, breaking a cube of the shape lets the enemy hit you for its
 * attack; in Relaxed nothing can hurt you.
 */
export function fightKind(encounter: Encounter, state: RunState): Kind {
  const enemy = encounter.enemy!;
  const hitsOn = state.mode === 'hearts';
  const hp = el('span', { className: 'run-meta' });
  const showHp = () => {
    const run = getCurrentRun();
    hp.textContent = run ? `Your HP ${run.hp}/${run.maxHp}` : '';
  };
  showHp();
  return {
    mode: hitsOn ? 'battle' : 'relaxed',
    header: el('section', { className: 'battle-bar', ariaLabel: 'Fight' }, [
      el('span', { className: 'enemy-sprite', ariaHidden: 'true' }, [enemyArt(enemy.sprite)]),
      el('span', {}, [el('strong', { textContent: enemy.name }), ' ', hp]),
    ]),
    hooks: {
      changed({ outcome }) {
        if (outcome !== 'strike') return;
        const run = getCurrentRun();
        if (!run || run.status !== 'active') return;
        const next = damage(run, enemy.attack);
        saveCurrentRun(next);
        playSound('hit', 0.1);
        showHp();
      },
    },
    attach(play) {
      // A hit that ends the run ends the fight too.
      const check = () => {
        if (getCurrentRun()?.status === 'lost' && !play.game.over) {
          play.showPanel([
            el('h2', { textContent: 'Knocked out' }),
            el('p', { className: 'end-note', textContent: `${enemy.name} got the better of you.` }),
            el('div', { className: 'end-actions' }, [
              el('a', {
                className: 'button primary',
                href: '#/story',
                textContent: 'See results →',
              }),
            ]),
          ]);
          playSound('knockout');
        }
      };
      play.screen.addEventListener('pointerup', check);
      play.screen.addEventListener('keyup', check);
    },
    note: (game) => `${enemy.name} defeated! · ${took(game)}`,
  };
}
