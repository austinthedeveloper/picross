import { markSceneSeen } from '../../../game/runSave';
import type { RunDef } from '../../../puzzles/runs';
import { runs } from '../../../puzzles/runs';
import { getScene } from '../../../puzzles/scenes';
import { el } from '../../dom';
import { renderSceneScreen } from '../sceneScreen';
import { jobsBoard, unlocked } from './jobsBoard';
import { pathMap } from './pathMap';
import { results } from './results';
import { loadRun, type Hub } from './shared';

export { renderRunEncounter } from './encounter';

/** Cleanup for a scene playing on the run screen, so navigating away stops it. */
let stopScene: (() => void) | undefined;

/**
 * The run hub at #/run: the jobs board when there's no run, the path map while
 * one is active, and a results screen once it's won or lost. Returns a cleanup
 * for the router.
 */
export function renderRunScreen(app: HTMLElement): () => void {
  const hub: Hub = {
    app,
    rerender: () => void renderRunScreen(app),
    // Plays a job's intro full screen, then comes back here.
    playIntro(def: RunDef) {
      const scene = def.intro ? getScene(def.intro) : undefined;
      if (!scene) return hub.rerender();
      stopScene = renderSceneScreen(app, scene, {
        onEnd: () => {
          stopScene = undefined;
          markSceneSeen(scene.id);
          hub.rerender();
        },
      });
    },
  };
  const run = loadRun();
  const body = !run
    ? jobsBoard(hub)
    : run.state.status === 'active'
      ? pathMap(hub, run.state, run.def)
      : results(hub, run.state, run.def);
  app.replaceChildren(el('main', { className: 'screen run' }, body));
  return () => stopScene?.();
}

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
        ? `${run!.def.name} · encounter ${run!.state.node + 1} of ${run!.def.encounters.length} · HP ${run!.state.hp}/${run!.state.maxHp}`
        : `${open} of ${runs.length} jobs open`,
    }),
    el('span', { className: 'run-banner-go', ariaHidden: 'true', textContent: '→' }),
  ]);
}
