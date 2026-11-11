import '@picross/shared/styles/tokens.css';
// The 3D game's styles, for a boss that switches to a block. Each game's own screen styles
// apply only on its board (scripts/scopeByBoard.ts); this order matches both games' own.
import '@picross/play-block/styles/voxels.css';
import '@picross/shared/styles/base.css';
import '@picross/play-grid/styles/board.css';
import '@picross/play-grid/styles/game.css';
import '@picross/play-block/styles/game.css';
import './styles/select.css';
import './styles/editor.css';
import '@picross/shared/styles/run.css';
import '@picross/shared/styles/fight.css';
import '@picross/shared/styles/dig.css';
import '@picross/shared/styles/dialogue.css';
import '@picross/shared/styles/art.css';
import './styles/badges.css';
import '@picross/play-block/styles/story.css';
import './styles/switch.css';
import { syncBadges } from './game/badges';
import { gameHref, lastGame } from '@picross/shared/ui/components/gameSwitch';
import { applyTheme } from '@picross/shared/ui/theme';
import { providePrefs } from '@picross/shared/game/prefs';
import { getSettings, updateSettings } from './game/settings';
import { ROUTES, type Cleanup, type Game, type Lazy } from './routes';
import { onHide, saveNow } from './ui/lifecycle';
import './offline/register';

// Shared code (sound, haptics, the theme, the mute button) reads this game's settings
// (Cubed's routes hand over Cubed's own while they're up: cubed/routes.ts).
function useFlatSettings(): void {
  providePrefs({ get: getSettings, update: updateSettings });
  applyTheme();
}
useFlatSettings();
// Older saves have already earned some badges, so nobody starts from zero (#108).
syncBadges();

// Dev builds only (#65): production builds drop this branch and the whole module.
if (import.meta.env.VITE_DEBUG === '1') {
  void import('./debug/panel').then(({ installDebugPanel }) => installDebugPanel());
}

const app = document.querySelector<HTMLDivElement>('#app')!;
let cleanup: Cleanup;
let game: Game = 'flat';
let routed = 0;

/** The screen is about to be `next`'s: its board's styles, and its settings. */
function enter(next: Game) {
  // Each game's screen styles apply only on its board (scripts/scopeByBoard.ts). A boss
  // that switches to a block sets this itself within the 2D game's run (blockFight.ts).
  if (next === 'cubed') document.documentElement.dataset.board = 'block';
  else delete document.documentElement.dataset.board;
  if (next === game) return;
  // The other game's screen would lose its styles while the next one loads.
  app.replaceChildren();
  if (next === 'flat') useFlatSettings();
  game = next;
}

function route() {
  cleanup?.();
  cleanup = undefined;
  onHide(null);
  const visit = ++routed;
  const hash = location.hash;
  let found: unknown;
  const next = ROUTES.find((r) => (found = r.match(hash)))!;
  enter(next.game ?? 'flat');
  const lazy: Lazy = (load, draw) => load.then((m) => (visit === routed ? draw(m) : undefined));
  const screen = next.render(app, found, lazy);
  if (screen instanceof Promise) {
    void screen.then((done) => {
      if (visit === routed) cleanup = done;
      else done?.();
    });
  } else cleanup = screen;
  window.scrollTo(0, 0);
}

// The site opens on whichever game you played last (the Flat | Cubed switch remembers).
if ((!location.hash || location.hash === '#/') && lastGame() === 'cubed') {
  history.replaceState(null, '', gameHref('cubed'));
}

window.addEventListener('hashchange', route);
// Cubed's screens save the board in progress when the tab closes, or goes into the
// background (a phone may close it from there without warning): ui/lifecycle.ts.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveNow();
});
window.addEventListener('pagehide', () => {
  if (game !== 'cubed') return;
  cleanup?.();
  cleanup = undefined;
});
// Back from the browser's page cache: Cubed's screen was torn down on the way out, so draw
// it again.
window.addEventListener('pageshow', (e) => {
  if (e.persisted && game === 'cubed') route();
});
route();
