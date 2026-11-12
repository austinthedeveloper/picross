import { hasSeenScene, markSceneSeen } from '../../../game/runSave';
import { getScene } from '@picross/story/puzzles/scenes';
import { chapters } from '@picross/block/story/data';
import { el } from '@picross/shared/ui/dom';
import { renderSceneScreen } from '@picross/story/ui/screens/sceneScreen';
import { chapterOpen, jobsBoard } from './jobsBoard';
import { pathMap } from './pathMap';
import { results } from './results';
import { loadRun, type Hub } from './shared';

let stopScene: (() => void) | undefined;

/**
 * The story at #/cubed/story: the jobs board with no run, the path map during one, and results
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
