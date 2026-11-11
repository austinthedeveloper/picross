import { hasSeenTip, markTipSeen } from '../../../../game/runSave';
import { enemyPowers, phasePowers, startingPowers, type Power } from '../../../../puzzles/enemies';
import { el } from '@picross/shared/ui/dom';
import { withArt } from '@picross/shared/ui/art';
import { tipToShow, type TipCard } from '@picross/story/fight/tips';
import { POWERS } from '../../../powers';
import type { FightContext } from './context';

/**
 * Power tips (#79). The first time you meet each enemy power, a one-line card
 * explains it, once ever. The ⓘ by the enemy's name lists all of its powers
 * anytime. Discovery stays the fun part; nobody spends a fight confused.
 *
 * The tips are the story's, for both boards (`tipToShow`, #167): a power you've met on a
 * block isn't explained again here, unless it works differently on a flat board, and then
 * its short note shows instead.
 */
export function createTips(ctx: FightContext) {
  const queue: TipCard[] = [];
  let listOpen = false;

  const showNext = () => {
    const tip = queue[0];
    if (!tip) return ctx.bar.setTip(null);
    const { icon, name, text, keys } = tip;
    const card = el('div', { className: 'tip-card', role: 'status' }, [
      el('span', { className: 'tip-icon', ariaHidden: 'true' }, withArt(icon)),
      el('p', { className: 'tip-text' }, [
        el('strong', { textContent: `${name}. ` }),
        ...withArt(text),
      ]),
      el('button', {
        className: 'button ghost tip-ok',
        textContent: 'Got it',
        onclick: () => {
          for (const key of keys) markTipSeen(key);
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
    const fresh = [...new Set(powers)]
      .filter((p) => !queue.some((tip) => tip.power === p))
      .flatMap((p) => tipToShow(p, 'flat', hasSeenTip, 'flat') ?? []);
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
                el('span', { className: 'tip-icon', ariaHidden: 'true' }, withArt(POWERS[p].icon)),
                el('p', { className: 'tip-text' }, [
                  el('strong', { textContent: `${POWERS[p].name}. ` }),
                  ...withArt(POWERS[p].tip),
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
