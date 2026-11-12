import { runs } from '../../../puzzles/runs';
import { el } from '@picross/shared/ui/dom';
import { unlocked } from './jobsBoard';
import { loadRun } from './shared';

/** How many of the story's jobs are open: "3 of 10 jobs open". */
export const jobsOpen = () => `${runs.filter(unlocked).length} of ${runs.length} jobs open`;

/** One line for the home screen: start or continue a run. */
export function runBanner(): HTMLElement {
  const run = loadRun();
  const active = run?.state.status === 'active';
  return el('a', { className: 'run-banner', href: '#/run' }, [
    el('span', {
      className: 'run-banner-title',
      textContent: active ? 'Continue run' : 'Pick a job',
    }),
    el('span', {
      className: 'run-banner-meta',
      textContent: active
        ? `${run!.def.name} · ${
            run!.def.endless
              ? `depth ${run!.state.node + 1}`
              : `encounter ${run!.state.node + 1} of ${run!.def.encounters.length}`
          } · HP ${run!.state.hp}/${run!.state.maxHp}`
        : jobsOpen(),
    }),
    el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
  ]);
}
