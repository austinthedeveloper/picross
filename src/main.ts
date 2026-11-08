import './styles/tokens.css';
import './styles/voxels.css';
import './styles/base.css';
import './styles/app.css';
import './styles/game.css';
import './styles/select.css';
import './styles/editor.css';
import './styles/art.css';
import './styles/dialogue.css';
import './styles/run.css';
import './styles/fight.css';
import './styles/dig.css';
import './styles/story.css';
import { getPuzzle } from './puzzles/index';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { getScene } from './puzzles/scenes';
import { renderSceneScreen } from './ui/screens/sceneScreen';
import { addListCard, renderSelectScreen } from './ui/screens/selectScreen';
import { renderStoryScreen, storyCard } from './ui/screens/story/index';
import { applyTheme } from './ui/theme';

applyTheme();
addListCard(storyCard);

const app = document.querySelector<HTMLDivElement>('#app')!;
let cleanup: (() => void) | undefined;
let routed = 0;

function route() {
  cleanup?.();
  cleanup = undefined;
  const visit = ++routed;
  const play = location.hash.match(/^#\/play\/([\w-]+)$/);
  const puzzle = play && getPuzzle(play[1]);
  const sceneMatch = location.hash.match(/^#\/scene\/([\w-]+)$/);
  const scene = sceneMatch && getScene(sceneMatch[1]);
  const shared = location.hash.match(/^#\/p\/([\w-]+)(\/test)?$/);
  // Screens with a block bring in three.js, so the list doesn't wait for it.
  const lazy = <M>(load: Promise<M>, render: (m: M) => (() => void) | void) =>
    void load.then((m) => {
      if (visit === routed) cleanup = render(m) ?? undefined;
    });
  if (puzzle) {
    lazy(import('./ui/screens/gameScreen'), (m) => m.renderGameScreen(app, puzzle));
  } else if (location.hash === '#/tutorial') {
    lazy(import('./ui/screens/tutorial'), (m) => m.renderTutorial(app));
  } else if (location.hash === '#/story') {
    cleanup = renderStoryScreen(app);
  } else if (location.hash === '#/story/play') {
    lazy(import('./ui/screens/story/encounter'), (m) => m.renderEncounter(app));
  } else if (scene) {
    cleanup = renderSceneScreen(app, scene);
  } else if (location.hash === '#/editor') {
    lazy(import('./ui/screens/editor/editorScreen'), (m) => m.renderEditorScreen(app));
  } else if (shared) {
    lazy(import('./ui/screens/sharedScreen'), (m) =>
      m.renderSharedScreen(app, shared[1], Boolean(shared[2])),
    );
  } else if (location.hash === '#/how-to-play') renderHowToPlay(app);
  else renderSelectScreen(app);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
// Save the board in progress when the tab closes.
window.addEventListener('pagehide', () => cleanup?.());
route();
