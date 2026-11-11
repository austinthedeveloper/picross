import { hasSeenScene, markSceneSeen } from '../../../game/runSave';
import { getScene } from '@picross/shared/puzzles/scenes';
import { chapters, jobs } from '../../../story/data';
import { el } from '@picross/shared/ui/dom';
import { renderSceneScreen } from '@picross/shared/ui/screens/sceneScreen';
import { chapterOpen, jobsBoard } from './jobsBoard';
import { pathMap } from './pathMap';
import { results } from './results';
import { loadRun, unlocked, type Hub } from './shared';

let stopScene: (() => void) | undefined;

/**
 * The story at #/story: the jobs board with no run, the path map during one, and results
 * once it's won or lost. Returns a cleanup for the router.
 */
export function renderStoryScreen(app: HTMLElement): () => void {
  const hub: Hub = {
    app,
    rerender: () => void renderStoryScreen(app),
    playScene(id) {
      const scene = getScene(id);
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
  // A chapter's opening plays the first time you see the board with it open.
  const opening = !run
    ? chapters.find((c) => c.opening && chapterOpen(c) && !hasSeenScene(c.opening))?.opening
    : undefined;
  if (opening) {
    hub.playScene(opening);
    return () => stopScene?.();
  }
  const body = !run
    ? jobsBoard(hub)
    : run.state.status === 'active'
      ? pathMap(hub, run.state, run.job)
      : results(hub, run.state, run.job);
  app.replaceChildren(el('main', { className: 'screen run' }, body));
  return () => stopScene?.();
}

/** The story's card on the puzzle list: start or continue. */
export function storyCard(): HTMLElement {
  const run = loadRun();
  const active = run?.state.status === 'active';
  const storyJobs = jobs.filter((j) => !j.overtimeOf && !j.bossOf);
  const open = storyJobs.filter(unlocked).length;
  return el('a', { className: 'feature-card story-card', href: '#/story' }, [
    el('div', {}, [
      el('p', { className: 'kicker', textContent: 'Story' }),
      el('p', {
        textContent: active
          ? `Continue ${run!.job.name} · encounter ${run!.state.node + 1} of ${run!.job.encounters.length} · HP ${run!.state.hp}/${run!.state.maxHp}`
          : `Rook and Dee’s odd jobs, in 3D. ${open} of ${storyJobs.length} jobs open.`,
      }),
    ]),
    el('span', { className: 'button primary', textContent: active ? 'Continue' : 'Pick a job' }),
  ]);
}
