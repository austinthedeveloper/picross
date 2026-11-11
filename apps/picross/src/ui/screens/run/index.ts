import { hasSeenScene, markSceneSeen } from '../../../game/runSave';
import { chapters } from '../../../puzzles/chapters';
import { getScene } from '@picross/story/puzzles/scenes';
import { el } from '@picross/shared/ui/dom';
import { renderSceneScreen } from '@picross/story/ui/screens/sceneScreen';
import { chapterOpen, jobsBoard } from './jobsBoard';
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
  // A chapter's opening plays the first time you see the board with it open (#23).
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
      ? pathMap(hub, run.state, run.def)
      : results(hub, run.state, run.def);
  app.replaceChildren(el('main', { className: 'screen run' }, body));
  return () => stopScene?.();
}
