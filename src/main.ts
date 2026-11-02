import './style.css';
import { getPuzzle } from './puzzles/index';
import { renderGameScreen } from './ui/gameScreen';
import { renderSelectScreen } from './ui/selectScreen';

const app = document.querySelector<HTMLDivElement>('#app')!;
let cleanup: (() => void) | undefined;

function route() {
  cleanup?.();
  cleanup = undefined;
  const match = location.hash.match(/^#\/play\/([\w-]+)$/);
  const puzzle = match && getPuzzle(match[1]);
  if (puzzle) {
    cleanup = renderGameScreen(app, puzzle);
  } else {
    renderSelectScreen(app);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
