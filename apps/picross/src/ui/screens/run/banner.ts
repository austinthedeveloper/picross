import { runs } from '../../../puzzles/runs';
import { el } from '@picross/shared/ui/dom';
import { unlocked } from './jobsBoard';
import { loadRun } from './shared';

/** One line for the puzzle list: start or continue a run. */
export function runBanner(): HTMLElement {
  const run = loadRun();
  const active = run?.state.status === 'active';
  const open = runs.filter(unlocked).length;
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
        : `${open} of ${runs.length} jobs open`,
    }),
    el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
  ]);
}
