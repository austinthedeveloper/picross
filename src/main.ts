import './styles/tokens.css';
import './styles/voxels.css';
import './styles/base.css';
import './styles/game.css';
import './styles/select.css';
import { getPuzzle } from './puzzles/index';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { renderSelectScreen } from './ui/screens/selectScreen';
import { applyTheme } from './ui/theme';

applyTheme();

const app = document.querySelector<HTMLDivElement>('#app')!;
let cleanup: (() => void) | undefined;
let routed = 0;

function route() {
  cleanup?.();
  cleanup = undefined;
  const visit = ++routed;
  const play = location.hash.match(/^#\/play\/([\w-]+)$/);
  const puzzle = play && getPuzzle(play[1]);
  if (puzzle) {
    // The play screen brings in three.js, so the list doesn't wait for it.
    void import('./ui/screens/gameScreen').then(({ renderGameScreen }) => {
      if (visit === routed) cleanup = renderGameScreen(app, puzzle);
    });
  } else if (location.hash === '#/how-to-play') renderHowToPlay(app);
  else renderSelectScreen(app);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
// Save the board in progress when the tab closes.
window.addEventListener('pagehide', () => cleanup?.());
route();
