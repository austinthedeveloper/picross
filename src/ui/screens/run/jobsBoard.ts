import { getJobStats, hasSeenScene } from '../../../game/runSave';
import { chapters, type Chapter } from '../../../puzzles/chapters';
import { getRun, type RunDef } from '../../../puzzles/runs';
import { el } from '../../dom';
import { backToPuzzles, modePicker, newRunButton, nodeIcon, type Hub } from './shared';

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
  return `Cleared ${stats.wins}× · best ${stats.bestHp}/${def.hp} HP left`;
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
      def.encounters.map((e) => el('li', { textContent: `${nodeIcon(e)} ${e.name}` })),
    ),
    el('p', {
      className: `job-best${cleared(def) ? '' : ' none'}`,
      textContent: bestResult(def),
    }),
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

/**
 * The jobs board (#47), grouped into chapters (#23): every job, its length and
 * boss, your best result, and Start.
 */
export function jobsBoard(hub: Hub): Node[] {
  return [
    el('header', { className: 'topbar' }, [backToPuzzles(), el('h1', { textContent: 'Jobs' })]),
    modePicker(hub),
    el(
      'div',
      { className: 'chapters' },
      chapters.map((c) => chapterSection(hub, c)),
    ),
  ];
}
