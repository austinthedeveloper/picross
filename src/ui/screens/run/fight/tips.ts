import { hasSeenTip, markTipSeen } from '../../../../game/runSave';
import { enemyPowers, phasePowers, startingPowers, type Power } from '../../../../puzzles/enemies';
import { el } from '../../../dom';
import { POWERS } from '../../../powers';
import type { FightContext } from './context';

/**
 * Power tips (#79). The first time you meet each enemy power, a one-line card
 * explains it, once ever. The ⓘ by the enemy's name lists all of its powers
 * anytime. Discovery stays the fun part; nobody spends a fight confused.
 */
export function createTips(ctx: FightContext) {
  const queue: Power[] = [];
  let listOpen = false;

  const showNext = () => {
    const power = queue[0];
    if (!power) return ctx.bar.setTip(null);
    const { icon, name, tip } = POWERS[power];
    const card = el('div', { className: 'tip-card', role: 'status' }, [
      el('span', { className: 'tip-icon', textContent: icon, ariaHidden: 'true' }),
      el('p', { className: 'tip-text' }, [el('strong', { textContent: `${name}. ` }), tip]),
      el('button', {
        className: 'button ghost tip-ok',
        textContent: 'Got it',
        onclick: () => {
          markTipSeen(power);
          queue.shift();
          showNext();
        },
      }),
    ]);
    listOpen = false;
    ctx.bar.setTip(card);
  };

  /** Queues tips for powers you haven't seen yet. */
  const introduce = (powers: Power[]) => {
    const fresh = powers.filter((p) => !hasSeenTip(p) && !queue.includes(p));
    if (!fresh.length) return;
    const idle = !queue.length;
    queue.push(...fresh);
    if (idle) showNext();
  };

  const list = () => {
    const powers = enemyPowers(ctx.enemy);
    return el('div', { className: 'tip-card powers', role: 'region', ariaLabel: 'Enemy powers' }, [
      powers.length
        ? el(
            'ul',
            { className: 'power-list' },
            powers.map((p) =>
              el('li', {}, [
                el('span', {
                  className: 'tip-icon',
                  textContent: POWERS[p].icon,
                  ariaHidden: 'true',
                }),
                el('p', { className: 'tip-text' }, [
                  el('strong', { textContent: `${POWERS[p].name}. ` }),
                  POWERS[p].tip,
                ]),
              ]),
            ),
          )
        : el('p', { className: 'tip-text', textContent: 'No special powers. Just a fight.' }),
      el('button', {
        className: 'button ghost tip-ok',
        textContent: 'Close',
        onclick: toggleList,
      }),
    ]);
  };

  function toggleList() {
    listOpen = !listOpen;
    if (listOpen) ctx.bar.setTip(list());
    else showNext();
    info.ariaExpanded = String(listOpen);
  }

  const info = el('button', {
    className: 'powers-info',
    textContent: 'ⓘ',
    ariaLabel: `What can ${ctx.enemy.name} do?`,
    ariaExpanded: 'false',
    onclick: toggleList,
  });
  ctx.bar.setInfo(info);

  return {
    /** Tips for the powers already in play: from the start, plus any phases already begun. */
    start() {
      const begun = (ctx.enemy.phases ?? []).slice(0, ctx.battle().phase ?? 0);
      introduce([...startingPowers(ctx.enemy), ...begun.flatMap(phasePowers)]);
    },
    /** Tips for what a phase brings in. */
    phase: (powers: Power[]) => introduce(powers),
  };
}

export type Tips = ReturnType<typeof createTips>;
