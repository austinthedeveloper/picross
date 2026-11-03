import type { Enemy } from '../../game/battle';
import { el } from '../dom';

export interface BattleBar {
  root: HTMLElement;
  /** The enemy's sprite, for aiming the finisher animation. */
  sprite: HTMLElement;
  setEnemyHp(hp: number): void;
  setPlayerHp(hp: number, max: number): void;
  /** Shows damage dealt to the enemy: a floating number and a flinch. */
  hitEnemy(amount: number): void;
  /** Shows the enemy hitting the player: a lunge, a red flash, and a floating number. */
  hitPlayer(amount: number): void;
  /** The enemy keels over. */
  defeat(): void;
}

function meter(label: string, className: string) {
  const text = el('span', { className: 'meter-text' });
  const fill = el('span', { className: 'meter-fill' });
  const root = el('div', { className: `meter ${className}`, role: 'meter', ariaLabel: label }, [
    text,
    el('span', { className: 'meter-track' }, [fill]),
  ]);
  root.setAttribute('aria-valuemin', '0');
  return {
    root,
    set(hp: number, max: number) {
      text.textContent = `${hp}/${max}`;
      root.style.setProperty('--value', String(max ? hp / max : 0));
      root.setAttribute('aria-valuemax', String(max));
      root.setAttribute('aria-valuenow', String(hp));
    },
  };
}

/** Replays a one-shot animation class on an element. */
function replay(node: HTMLElement, className: string, ms = 700) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  window.setTimeout(() => node.classList.remove(className), ms);
}

function floatNumber(host: HTMLElement, text: string, className: string) {
  const number = el('span', { className: `float-number ${className}`, textContent: text });
  number.setAttribute('aria-hidden', 'true');
  host.append(number);
  window.setTimeout(() => number.remove(), 900);
}

/** Enemy and player HP shown above the board during a fight. */
export function createBattleBar(enemy: Enemy, enemyHp: number): BattleBar {
  const sprite = el('span', { className: 'enemy-sprite', textContent: enemy.sprite });
  sprite.setAttribute('aria-hidden', 'true');
  const enemyMeter = meter(`${enemy.name} HP`, 'enemy-hp');
  const playerMeter = meter('Your HP', 'player-hp');
  const enemySide = el('div', { className: 'battle-side enemy' }, [
    sprite,
    el('div', { className: 'battle-info' }, [
      el('span', { className: 'battle-name', textContent: enemy.name }),
      enemyMeter.root,
    ]),
  ]);
  const playerSide = el('div', { className: 'battle-side player' }, [
    el('div', { className: 'battle-info' }, [
      el('span', { className: 'battle-name', textContent: 'You' }),
      playerMeter.root,
    ]),
  ]);
  const root = el('section', { className: 'battle', ariaLabel: 'Fight' }, [enemySide, playerSide]);
  enemyMeter.set(enemyHp, enemy.hp);

  return {
    root,
    sprite,
    setEnemyHp: (hp) => enemyMeter.set(hp, enemy.hp),
    setPlayerHp: (hp, max) => playerMeter.set(hp, max),
    hitEnemy(amount) {
      replay(sprite, 'flinch');
      floatNumber(enemySide, `−${amount}`, 'to-enemy');
    },
    hitPlayer(amount) {
      replay(sprite, 'lunge');
      replay(playerSide, 'hurt');
      floatNumber(playerSide, `−${amount}`, 'to-player');
    },
    defeat() {
      sprite.classList.add('defeated');
    },
  };
}
