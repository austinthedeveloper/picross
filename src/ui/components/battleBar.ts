import type { Enemy } from '../../game/battle';
import { el } from '../dom';
import { playOnce } from '../motion';

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
  /** Shows how many hits the player's shield will block. */
  setShield(hits: number): void;
  /** A shield absorbs a hit. */
  block(): void;
  /** Replaces the gadget buttons. */
  setGadgets(buttons: HTMLElement[]): void;
  /** Announces a message to screen readers. */
  say(message: string): void;
  /** Shows the enemy's armor and how many weak points are left (#50); 0 hides it. */
  setArmor(weakPoints: number): void;
  /** Shows how many forged clues are left to call out (#64); hidden at 0. */
  setFakes(count: number): void;
  /** The armor shatters. */
  armorBreaks(): void;
  /** Changes the enemy's name and sprite (boss phases, #42). */
  setForm(name: string, icon: string): void;
  /** A banner across the bar when a boss changes phase. */
  phaseBanner(name: string, taunt: string): void;
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
  const enemyName = el('span', { className: 'battle-name', textContent: enemy.name });
  const armor = el('span', { className: 'armor', hidden: true });
  const fakes = el('span', { className: 'fakes', hidden: true });
  const banner = el('div', { className: 'phase-banner', hidden: true });
  banner.setAttribute('aria-hidden', 'true');
  const enemySide = el('div', { className: 'battle-side enemy' }, [
    sprite,
    el('div', { className: 'battle-info' }, [
      el('span', { className: 'battle-name-row' }, [enemyName, armor, fakes]),
      enemyMeter.root,
    ]),
  ]);
  const shield = el('span', { className: 'shield', hidden: true });
  const playerSide = el('div', { className: 'battle-side player' }, [
    el('div', { className: 'battle-info' }, [
      el('span', { className: 'battle-name' }, [shield, 'You']),
      playerMeter.root,
    ]),
  ]);
  const tray = el('div', { className: 'gadget-tray', role: 'group', ariaLabel: 'Gadgets' });
  const live = el('div', { className: 'sr-only', ariaLive: 'polite' });
  const root = el('section', { className: 'battle', ariaLabel: 'Fight' }, [
    el('div', { className: 'battle-row' }, [enemySide, playerSide]),
    tray,
    banner,
    live,
  ]);
  enemyMeter.set(enemyHp, enemy.hp);

  return {
    root,
    sprite,
    setEnemyHp: (hp) => enemyMeter.set(hp, enemy.hp),
    setPlayerHp: (hp, max) => playerMeter.set(hp, max),
    hitEnemy(amount) {
      playOnce(sprite, 'flinch', 700);
      floatNumber(enemySide, `−${amount}`, 'to-enemy');
    },
    hitPlayer(amount) {
      playOnce(sprite, 'lunge', 700);
      playOnce(playerSide, 'hurt', 700);
      floatNumber(playerSide, `−${amount}`, 'to-player');
    },
    defeat() {
      sprite.classList.add('defeated');
    },
    setShield(hits) {
      shield.hidden = hits <= 0;
      shield.textContent = hits > 1 ? `🛡×${hits} ` : '🛡 ';
      shield.ariaLabel = `Shield blocks ${hits} ${hits === 1 ? 'hit' : 'hits'}`;
    },
    block() {
      playOnce(sprite, 'lunge', 700);
      playOnce(shield, 'blocked', 700);
      floatNumber(playerSide, 'Blocked!', 'to-player');
    },
    setGadgets(buttons) {
      tray.replaceChildren(...buttons);
      tray.hidden = buttons.length === 0;
    },
    setArmor(weakPoints) {
      armor.hidden = weakPoints <= 0;
      armor.textContent = `🛡 ${weakPoints}🎯`;
      armor.title = `Armored: ${weakPoints} weak point${weakPoints === 1 ? '' : 's'} left`;
    },
    setFakes(count) {
      fakes.hidden = count <= 0;
      fakes.textContent = `🎭 ${count}`;
      fakes.title = `${count} forged clue${count === 1 ? '' : 's'} left to call out`;
      fakes.ariaLabel = fakes.title;
    },
    armorBreaks() {
      playOnce(armor, 'shatter', 600);
      playOnce(sprite, 'flinch', 700);
      floatNumber(enemySide, 'Armor broken!', 'to-enemy');
      window.setTimeout(() => (armor.hidden = true), 600);
    },
    setForm(name, icon) {
      enemyName.textContent = name;
      sprite.textContent = icon;
    },
    phaseBanner(name, taunt) {
      banner.replaceChildren(
        el('strong', { textContent: name }),
        ...(taunt ? [el('span', { textContent: taunt })] : []),
      );
      banner.hidden = false;
      playOnce(root, 'phase-shift', 1200);
      playOnce(sprite, 'flinch', 700);
      window.setTimeout(() => (banner.hidden = true), 2200);
    },
    say(message) {
      live.textContent = '';
      requestAnimationFrame(() => (live.textContent = message));
    },
  };
}
