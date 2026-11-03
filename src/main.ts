import './styles/tokens.css';
import './styles/base.css';
import './styles/board.css';
import './styles/game.css';
import './styles/select.css';
import './styles/editor.css';
import './styles/run.css';
import './styles/fight.css';
import './styles/dig.css';
import './styles/dialogue.css';
import { getPuzzle } from './puzzles/index';
import { getMural } from './puzzles/murals';
import { getScene } from './puzzles/scenes';
import { renderDailyScreen } from './ui/screens/daily';
import { renderEditorScreen } from './ui/screens/editorScreen';
import { renderMuralScreen, renderMuralTile } from './ui/screens/mural';
import { renderGameScreen } from './ui/screens/gameScreen';
import { renderRunEncounter, renderRunScreen } from './ui/screens/run';
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
  const muralMatch = location.hash.match(/^#\/mural\/([\w-]+)(?:\/(\d+))?$/);
  const mural = muralMatch && getMural(muralMatch[1]);
  const tile = mural && muralMatch[2] ? Number(muralMatch[2]) - 1 : null;
  if (puzzle) {
    cleanup = renderGameScreen(app, puzzle);
  } else if (scene && getScene(scene[1])) {
    cleanup = renderSceneScreen(app, getScene(scene[1])!);
  } else if (mural && tile !== null && mural.tiles[tile]) {
    cleanup = renderMuralTile(app, mural, tile);
  } else if (mural && tile === null) {
    renderMuralScreen(app, mural);
  } else if (location.hash === '#/daily') {
    cleanup = renderDailyScreen(app);
  } else if (location.hash === '#/run') {
    cleanup = renderRunScreen(app);
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
