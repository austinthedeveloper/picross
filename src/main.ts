import './styles/tokens.css';
import './styles/base.css';
import './styles/board.css';
import './styles/game.css';
import './styles/select.css';
import './styles/editor.css';
import './styles/run.css';
import './styles/dialogue.css';
import { getPuzzle } from './puzzles/index';
import { getScene } from './puzzles/scenes';
import { renderEditorScreen } from './ui/screens/editorScreen';
import { renderGameScreen } from './ui/screens/gameScreen';
import { renderRunEncounter, renderRunScreen } from './ui/screens/runScreen';
import { renderSceneScreen } from './ui/screens/sceneScreen';
import { renderSelectScreen } from './ui/screens/selectScreen';
import { applyTheme } from './ui/theme';

applyTheme();

const app = document.querySelector<HTMLDivElement>('#app')!;
let cleanup: (() => void) | undefined;

function route() {
  cleanup?.();
  cleanup = undefined;
  const match = location.hash.match(/^#\/play\/([\w-]+)$/);
  const puzzle = match && getPuzzle(match[1]);
  const scene = location.hash.match(/^#\/scene\/([\w-]+)$/);
  if (puzzle) {
    cleanup = renderGameScreen(app, puzzle);
  } else if (scene && getScene(scene[1])) {
    cleanup = renderSceneScreen(app, getScene(scene[1])!);
  } else if (location.hash === '#/run') {
    renderRunScreen(app);
  } else if (location.hash === '#/run/play') {
    cleanup = renderRunEncounter(app);
  } else if (location.hash === '#/editor') {
    renderEditorScreen(app);
  } else {
    renderSelectScreen(app);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
