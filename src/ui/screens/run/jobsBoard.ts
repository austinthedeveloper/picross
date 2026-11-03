import { getJobStats, hasSeenScene } from '../../../game/runSave';
import { getRun, runs, type RunDef } from '../../../puzzles/runs';
import { el } from '../../dom';
import { backToPuzzles, modePicker, newRunButton, nodeIcon, type Hub } from './shared';

/** A job you can start: everything without `requires`, plus jobs whose requirement you've won. */
export const unlocked = (def: RunDef) =>
  !def.requires || (getJobStats(def.requires)?.wins ?? 0) > 0;

function bestResult(def: RunDef): string {
  const stats = getJobStats(def.id);
  if (!stats?.plays) return 'Not played yet';
  if (!stats.wins) return `${stats.plays} ${stats.plays === 1 ? 'try' : 'tries'}, not cleared yet`;
  return `Cleared ${stats.wins}× · best ${stats.bestHp}/${def.hp} HP left`;
}

/** The jobs board (#47): every job, its length and boss, your best result, and Start. */
export function jobsBoard(hub: Hub): Node[] {
  const card = (def: RunDef) => {
    const open = unlocked(def);
    const boss = def.encounters.find((e) => e.boss);
    return el('section', { className: `run-card job${open ? '' : ' locked'}` }, [
      el('h2', { textContent: open ? def.name : `🔒 ${def.name}` }),
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
        className: `job-best${getJobStats(def.id)?.wins ? '' : ' none'}`,
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
                    onclick: () => hub.playIntro(def),
                  }),
                ]
              : []),
          ])
        : el('p', {
            className: 'run-meta',
            textContent: `Win ${getRun(def.requires!)?.name ?? def.requires} to unlock.`,
          }),
    ]);
  };
  return [
    el('header', { className: 'topbar' }, [backToPuzzles(), el('h1', { textContent: 'Jobs' })]),
    modePicker(hub),
    el('div', { className: 'jobs' }, runs.map(card)),
  ];
}
