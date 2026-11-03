import './styles/tokens.css';
import './styles/base.css';
import './styles/board.css';
import './styles/game.css';
import './styles/select.css';
import './styles/editor.css';
import { getPuzzle } from './puzzles/index';
import { renderEditorScreen } from './ui/screens/editorScreen';
import { renderGameScreen } from './ui/screens/gameScreen';
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
  if (puzzle) {
    cleanup = renderGameScreen(app, puzzle);
  } else if (location.hash === '#/editor') {
    renderEditorScreen(app);
  } else {
    renderSelectScreen(app);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
