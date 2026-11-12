import { getEarned, nextTierHint } from '../../../game/badges';
import { getJobStats, hasSeenScene } from '../../../game/runSave';
import { jobBadgeFor } from '../../../puzzles/badges';
import { chapters, type Chapter } from '../../../puzzles/chapters';
import { ENDLESS_GADGETS, ENDLESS_HP, ENDLESS_ID, ENDLESS_HEAL } from '../../../puzzles/endless';
import { bossFightsFor, getRun, overtimeFor, type RunDef } from '../../../puzzles/runs';
import { withArt } from '@picross/shared/ui/art';
import { badgeIcon, tierTag } from '../../components/badge';
import { gameHref } from '@picross/shared/game/boards';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { modePicker, newRunButton, nodeIcon, type Hub } from './shared';

/** A job you can start: everything without `requires`, plus jobs whose requirement you've won. */
export const unlocked = (def: RunDef) =>
  !def.requires || (getJobStats(def.requires)?.wins ?? 0) > 0;

/** A chapter is open once its first job is (#23). */
export const chapterOpen = (chapter: Chapter) => unlocked(chapter.jobs[0]);

const cleared = (def: RunDef) => (getJobStats(def.id)?.wins ?? 0) > 0;

function bestResult(def: RunDef): string {
  const stats = getJobStats(def.id);
  if (!stats?.plays) return 'Not played yet';
  if (!stats.wins) return `${stats.plays} ${stats.plays === 1 ? 'try' : 'tries'}, not cleared yet`;
  // Nothing can hurt you in Relaxed, so only Hits-on wins have a best worth showing (#107).
  const best = stats.hitsOnWins ? ` · best ${stats.bestHp}/${def.hp} HP left` : '';
  return `Cleared ${stats.wins}×${best}`;
}

/** A job's badge on its card (#108): the best tier so far, and what the next one needs. */
function jobBadge(def: RunDef): HTMLElement[] {
  const badge = jobBadgeFor(def.id);
  if (!badge) return [];
  const earned = getEarned(badge.id);
  return [
    el('div', { className: 'job-badge' }, [
      badgeIcon(badge, { earned: Boolean(earned), tier: earned?.tier }),
      el('div', { className: 'badge-text' }, [
        el('strong', { className: 'badge-name', textContent: badge.name }),
        ...(earned?.tier ? [tierTag(earned.tier)] : []),
        el('span', { className: 'badge-how', textContent: nextTierHint(earned) }),
      ]),
    ]),
  ];
}

/** A cleared job's harder replay (#113), on its card. */
function overtimeOffer(hub: Hub, def: RunDef): HTMLElement[] {
  const overtime = overtimeFor(def.id);
  if (!overtime || !cleared(def)) return [];
  return [
    el('div', { className: 'job-overtime' }, [
      el('strong', { textContent: 'Overtime' }),
      ...(overtime.blurb ? [el('p', { className: 'job-blurb', textContent: overtime.blurb })] : []),
      el('p', {
        className: 'run-meta',
        textContent: `${overtime.encounters.length} encounters · ${overtime.hp} HP · Hits on only`,
      }),
      el('p', {
        className: `job-best${cleared(overtime) ? '' : ' none'}`,
        textContent: bestResult(overtime),
      }),
      newRunButton(hub, overtime, 'Start Overtime'),
    ]),
  ];
}

/** Standalone boss fights a cleared job unlocks, on its card. */
function bossOffers(hub: Hub, def: RunDef): HTMLElement[] {
  if (!cleared(def)) return [];
  return bossFightsFor(def.id).map((fight) => {
    const boss = fight.encounters.find((e) => e.boss) ?? fight.encounters[0];
    return el('div', { className: 'job-boss-fight' }, [
      el('strong', { textContent: `Boss fight: ${boss.name}` }),
      ...(fight.blurb ? [el('p', { className: 'job-blurb', textContent: fight.blurb })] : []),
      el('p', { className: 'run-meta', textContent: `One fight · ${fight.hp} HP` }),
      el('p', {
        className: `job-best${cleared(fight) ? '' : ' none'}`,
        textContent: bestResult(fight),
      }),
      newRunButton(hub, fight, 'Start boss fight'),
    ]);
  });
}

function jobCard(hub: Hub, def: RunDef): HTMLElement {
  const open = unlocked(def);
  const boss = def.encounters.find((e) => e.boss);
  return el('section', { className: `run-card job${open ? '' : ' locked'}` }, [
    el('h3', { textContent: open ? def.name : `🔒 ${def.name}` }),
    ...(def.blurb ? [el('p', { className: 'job-blurb', textContent: def.blurb })] : []),
    el('p', {
      className: 'run-meta',
      textContent: `${def.encounters.length} encounters · ${def.hp} HP${boss ? ` · Boss: ${boss.name}` : ''}`,
    }),
    el(
      'ol',
      { className: 'run-preview' },
      def.encounters.map((e) => el('li', {}, [nodeIcon(e), e.name])),
    ),
    el('p', {
      className: `job-best${cleared(def) ? '' : ' none'}`,
      textContent: bestResult(def),
    }),
    ...(open ? jobBadge(def) : []),
    ...(open ? overtimeOffer(hub, def) : []),
    ...(open ? bossOffers(hub, def) : []),
    open
      ? el('div', { className: 'end-actions' }, [
          newRunButton(hub, def, 'Start'),
          ...(def.intro && hasSeenScene(def.intro)
            ? [
                el('button', {
                  className: 'button ghost',
                  textContent: '▶ Watch the intro',
                  onclick: () => hub.playScene(def.intro!),
                }),
              ]
            : []),
        ])
      : el('p', {
          className: 'run-meta',
          textContent: `Win ${getRun(def.requires!)?.name ?? def.requires} to unlock.`,
        }),
  ]);
}

/** A chapter's heading, progress, and jobs; a locked chapter is one card saying what opens it. */
function chapterSection(hub: Hub, chapter: Chapter): HTMLElement {
  const label = `Chapter ${chapter.number}`;
  if (!chapterOpen(chapter)) {
    const needs = chapter.jobs[0].requires;
    return el('section', { className: 'chapter locked' }, [
      el('h2', { className: 'chapter-title' }, [
        el('span', { className: 'chapter-number', textContent: label }),
        '🔒 ???',
      ]),
      el('p', {
        className: 'chapter-blurb',
        textContent: `Clear ${getRun(needs!)?.name ?? needs} to continue the story.`,
      }),
    ]);
  }
  const done = chapter.jobs.filter(cleared).length;
  return el('section', { className: 'chapter' }, [
    el('h2', { className: 'chapter-title' }, [
      el('span', { className: 'chapter-number', textContent: label }),
      chapter.title,
    ]),
    el('p', {
      className: 'chapter-progress',
      textContent: `${done}/${chapter.jobs.length} cleared`,
    }),
    ...(chapter.blurb ? [el('p', { className: 'chapter-blurb', textContent: chapter.blurb })] : []),
    ...(chapter.opening && hasSeenScene(chapter.opening)
      ? [
          el('button', {
            className: 'button ghost chapter-replay',
            textContent: '▶ Chapter story',
            onclick: () => hub.playScene(chapter.opening!),
          }),
        ]
      : []),
    el(
      'div',
      { className: 'jobs' },
      chapter.jobs.map((def) => jobCard(hub, def)),
    ),
  ]);
}

/** Endless mode (#68) opens once you've cleared a job. */
const ENDLESS_AFTER = 'first-job';

/** Endless mode's card (#68), below the chapters. */
function endlessSection(hub: Hub): HTMLElement {
  const open = cleared({ id: ENDLESS_AFTER } as RunDef);
  const def: RunDef = {
    id: ENDLESS_ID,
    name: 'Endless',
    hp: ENDLESS_HP,
    gadgets: ENDLESS_GADGETS,
    encounters: [],
    endless: true,
  };
  const best = getJobStats(ENDLESS_ID)?.bestDepth;
  return el('section', { className: `chapter endless${open ? '' : ' locked'}` }, [
    el('h2', { className: 'chapter-title' }, [
      el('span', { className: 'chapter-number', textContent: 'Endless' }),
      open ? 'How deep can you go?' : '🔒 ???',
    ]),
    el('p', {
      className: 'chapter-blurb',
      textContent: open
        ? `Every enemy from the jobs you've played, in a fresh order, harder as you go. +${ENDLESS_HEAL} HP after each fight; every fourth node is a dig or a rest stop.`
        : `Clear ${getRun(ENDLESS_AFTER)?.name ?? ENDLESS_AFTER} to open Endless.`,
    }),
    ...(open
      ? [
          el('section', { className: 'run-card job endless' }, [
            el(
              'p',
              { className: 'run-meta' },
              withArt(`${ENDLESS_HP} HP · starts with a 🩹 patch kit`),
            ),
            el('p', {
              className: `job-best${best ? '' : ' none'}`,
              textContent: best ? `Best depth: ${best}` : 'Not played yet',
            }),
            el('div', { className: 'end-actions' }, [newRunButton(hub, def, 'Start')]),
          ]),
        ]
      : []),
  ]);
}

/**
 * The jobs board (#47), grouped into chapters (#23): every job, its length and
 * boss, your best result, and Start. Endless mode (#68) sits below.
 */
export function jobsBoard(hub: Hub): Node[] {
  return [
    el('header', { className: 'topbar' }, [
      homeLink(),
      el('h1', { textContent: 'Jobs' }),
      el('a', { className: 'jobs-badges', href: '#/badges', textContent: 'Badges →' }),
    ]),
    modePicker(hub),
    el('div', { className: 'chapters' }, [
      ...chapters.map((c) => chapterSection(hub, c)),
      endlessSection(hub),
    ]),
    // Until there's one story for both boards (#174), Cubed plays its own copy, on blocks.
    el('a', { className: 'run-banner cubed-story', href: `${gameHref('cubed')}/story` }, [
      el('span', { className: 'run-banner-title', textContent: 'The story on blocks' }),
      el('span', {
        className: 'run-banner-meta',
        textContent: 'The same jobs in Picross Cubed, every fight on a block',
      }),
      el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
    ]),
  ];
}
