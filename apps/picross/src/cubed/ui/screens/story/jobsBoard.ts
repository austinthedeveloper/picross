import { getJobStats, hasSeenScene } from '../../../game/runSave';
import {
  bossFightsFor,
  chapters,
  getJob,
  overtimeFor,
  type Chapter,
  type Job,
} from '@picross/block/story/data';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { cleared, modePicker, newRunButton, nodeIcon, unlocked, type Hub } from './shared';
import { cubedHref } from '../../../href';

/** A chapter is open once its first job is. */
export const chapterOpen = (chapter: Chapter) => unlocked(chapter.jobs[0]);

function bestResult(job: Job): string {
  const stats = getJobStats(job.id);
  if (!stats?.plays) return 'Not played yet';
  if (!stats.wins) return `${stats.plays} ${stats.plays === 1 ? 'try' : 'tries'}, not cleared yet`;
  // Nothing can hurt you in Relaxed, so only Hits-on wins have a best worth showing.
  const best = stats.hitsOnWins ? ` · best ${stats.bestHp}/${job.hp} HP left` : '';
  return `Cleared ${stats.wins}×${best}`;
}

function extraRun(hub: Hub, job: Job, title: string, meta: string, start: string): HTMLElement {
  return el('div', { className: 'job-overtime' }, [
    el('strong', { textContent: title }),
    ...(job.blurb ? [el('p', { className: 'job-blurb', textContent: job.blurb })] : []),
    el('p', { className: 'run-meta', textContent: meta }),
    el('p', { className: `job-best${cleared(job) ? '' : ' none'}`, textContent: bestResult(job) }),
    newRunButton(hub, job, start),
  ]);
}

function jobCard(hub: Hub, job: Job): HTMLElement {
  const open = unlocked(job);
  const boss = job.encounters.find((e) => e.boss);
  const extras =
    open && cleared(job)
      ? [
          ...overtimeFor(job.id).map((o) =>
            extraRun(
              hub,
              o,
              'Overtime',
              `${o.encounters.length} encounters · ${o.hp} HP · Hits on only`,
              'Start Overtime',
            ),
          ),
          ...bossFightsFor(job.id).map((f) => {
            const b = f.encounters.find((e) => e.boss) ?? f.encounters[0];
            return extraRun(
              hub,
              f,
              `Boss fight: ${b.name}`,
              `One fight · ${f.hp} HP`,
              'Start boss fight',
            );
          }),
        ]
      : [];
  return el('section', { className: `run-card job${open ? '' : ' locked'}` }, [
    el('h3', { textContent: open ? job.name : `🔒 ${job.name}` }),
    ...(job.blurb ? [el('p', { className: 'job-blurb', textContent: job.blurb })] : []),
    el('p', {
      className: 'run-meta',
      textContent: `${job.encounters.length} encounters · ${job.hp} HP${boss ? ` · Boss: ${boss.name}` : ''}`,
    }),
    el(
      'ol',
      { className: 'run-preview' },
      job.encounters.map((e) => el('li', {}, [nodeIcon(e), e.name])),
    ),
    el('p', { className: `job-best${cleared(job) ? '' : ' none'}`, textContent: bestResult(job) }),
    ...extras,
    open
      ? el('div', { className: 'end-actions' }, [
          newRunButton(hub, job, 'Start'),
          ...(job.intro && hasSeenScene(job.intro)
            ? [
                el('button', {
                  className: 'button ghost',
                  textContent: '▶ Watch the intro',
                  onclick: () => hub.playScene(job.intro!),
                }),
              ]
            : []),
        ])
      : el('p', {
          className: 'run-meta',
          textContent: `Win ${getJob(job.requires!)?.name ?? job.requires} to unlock.`,
        }),
  ]);
}

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
        textContent: `Clear ${getJob(needs!)?.name ?? needs} to continue the story.`,
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
      chapter.jobs.map((job) => jobCard(hub, job)),
    ),
  ]);
}

/** The jobs board, grouped into chapters: every job, its length and boss, your best, Start. */
export function jobsBoard(hub: Hub): Node[] {
  return [
    el('header', { className: 'topbar' }, [
      homeLink(cubedHref()),
      el('h1', { textContent: 'Jobs' }),
    ]),
    modePicker(hub),
    el(
      'div',
      { className: 'chapters' },
      chapters.map((c) => chapterSection(hub, c)),
    ),
  ];
}
