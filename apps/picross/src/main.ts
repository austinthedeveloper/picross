import '@picross/shared/styles/tokens.css';
// The 3D game's styles, for a boss that switches to a block. Each game's own screen styles
// apply only on its board (scripts/scopeByBoard.ts); this order matches both games' own.
import '../../cubed/src/styles/voxels.css';
import '@picross/shared/styles/base.css';
import '@picross/play-grid/styles/board.css';
import '@picross/play-grid/styles/game.css';
import '../../cubed/src/styles/game.css';
import './styles/select.css';
import './styles/editor.css';
import '@picross/shared/styles/run.css';
import '@picross/shared/styles/fight.css';
import '@picross/shared/styles/dig.css';
import '@picross/shared/styles/dialogue.css';
import '@picross/shared/styles/art.css';
import './styles/badges.css';
import '../../cubed/src/styles/story.css';
import './styles/switch.css';
import { syncBadges } from './game/badges';
import { getPuzzle } from '@picross/grid/puzzles/index';
import { getMural } from '@picross/grid/puzzles/murals';
import { getScene } from '@picross/shared/puzzles/scenes';
import { renderBadgesScreen } from './ui/screens/badges';
import { renderDailyScreen } from './ui/screens/daily';
import { renderEditorScreen } from './ui/screens/editorScreen';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { renderMuralScreen, renderMuralTile } from './ui/screens/mural';
import { renderGameScreen } from '@picross/play-grid/ui/screens/gameScreen';
import { freePlaySession } from './ui/screens/freePlaySession';
import { renderRunEncounter, renderRunScreen } from './ui/screens/run';
import { renderSceneScreen } from '@picross/shared/ui/screens/sceneScreen';
import { gameHref, lastGame } from '@picross/shared/ui/components/gameSwitch';
import { renderSelectScreen } from './ui/screens/selectScreen';
import { applyTheme } from '@picross/shared/ui/theme';
import { providePrefs } from '@picross/shared/game/prefs';
import { getSettings, updateSettings } from './game/settings';

// Shared code (sound, haptics, the theme, the mute button) reads this game's settings.
providePrefs({ get: getSettings, update: updateSettings });
applyTheme();
// Older saves have already earned some badges, so nobody starts from zero (#108).
syncBadges();

// Dev builds only (#65): production builds drop this branch and the whole module.
if (import.meta.env.VITE_DEBUG === '1') {
  void import('./debug/panel').then(({ installDebugPanel }) => installDebugPanel());
}

const app = document.querySelector<HTMLDivElement>('#app')!;
let cleanup: (() => void) | undefined;

// The site opens on whichever game you played last (the Flat | Cubed switch remembers).
const leaving = (!location.hash || location.hash === '#/') && lastGame() === 'cubed';
if (leaving) location.replace(gameHref('cubed', 'flat'));

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
    cleanup = renderGameScreen(app, puzzle, freePlaySession(puzzle));
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
  } else if (location.hash === '#/badges') {
    renderBadgesScreen(app);
  } else if (location.hash === '#/how-to-play') {
    renderHowToPlay(app);
  } else if (location.hash === '#/editor') {
    renderEditorScreen(app);
  } else {
    renderSelectScreen(app);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
if (!leaving) route();
