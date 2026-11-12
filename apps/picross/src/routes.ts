/**
 * The app's routes: which screen each URL hash opens. `main.ts` tries them in order and
 * draws the first that matches, so a new screen is one entry here. A screen that loads its
 * module first (anything with a block, which brings three.js) does it through `lazy`, which
 * draws only if the player hasn't moved on meanwhile.
 *
 * Picross Cubed, the 3D game, is one entry: everything under `#/cubed/…`, loaded with one
 * `import('./cubed/routes')`, so neither its screens nor three.js are in the first download
 * (`npm run check:budget` checks). `#/scene/<id>` is both games', and so is `#/daily`, which
 * opens Cubed's daily screen the same way on a Cubed day (#156). `#/badges` is both games' shelf
 * (#157). Free play (#153) is both games' too: `#/free/flat` and `#/free/cubed`, a tab each,
 * and `#/free` the last tab used. `#/settings` is both games' settings (#154). `#/` is the home
 * screen, one menu for both (#152), and `#/endless` the jobs board at Endless. The 2D game's
 * run and its fights (`#/run…`) load with `import()` too, and the fight engine with them.
 */
import { getPuzzle } from '@picross/grid/puzzles/index';
import { getMural } from '@picross/grid/puzzles/murals';
import { getScene } from '@picross/story/puzzles/scenes';
import { freePlayHref } from './game/freePlay';
import { getSettings } from './game/settings';
import { dailyDimension, dateKey } from '@picross/shared/puzzles/days';
import { renderGameScreen } from '@picross/play-grid/ui/screens/gameScreen';
import { renderSceneScreen } from '@picross/story/ui/screens/sceneScreen';
import { renderBadgesScreen } from './ui/screens/badges';
import { renderDailyScreen } from './ui/screens/daily';
import { renderEditorScreen } from './ui/screens/editorScreen';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { renderMuralScreen, renderMuralTile } from './ui/screens/mural';
import { renderFreePlay } from './ui/screens/freePlay';
import { freePlaySession } from './ui/screens/freePlaySession';
import { renderHome } from './ui/screens/home';

/** What a screen leaves for the router: a cleanup to run before the next screen, if any. */
export type Cleanup = (() => void) | void | undefined;
/** A screen drawn now, or once its module loads. */
export type Screen = Cleanup | Promise<Cleanup>;
/** Loads a screen's module, then draws it unless another route has opened since. */
export type Lazy = <M>(load: Promise<M>, draw: (m: M) => Screen) => Promise<Cleanup>;

/**
 * Whose screen a route is. Cubed's routes put `<html data-board="block">` up (its styles
 * apply only there, scripts/scopeByBoard.ts), read Cubed's settings, and save on the way out
 * of the page (ui/lifecycle.ts).
 */
export type Game = 'flat' | 'cubed';

export interface Route<T = unknown> {
  /** What the screen needs from the hash, or nothing when the hash isn't this route's. */
  match(hash: string): T | null | undefined | false;
  render(app: HTMLElement, found: T, lazy: Lazy): Screen;
  /** Default: flat. */
  game?: Game;
}

/**
 * Old links and where they go now. `main.ts` swaps the hash before routing, so the old one
 * leaves no step in the history.
 */
const MOVED: Record<string, string> = {
  // Cubed's daily (#156) and badges (#157): one of each for both boards now.
  '#/cubed/daily': '#/daily',
  '#/cubed/badges': '#/badges',
  // Cubed's list is free play's Cubed tab since the one home screen (#152).
  '#/cubed': '#/free/cubed',
};

/** Where `hash` goes now: itself, unless it's an old link, or `#/free` (its last tab, #153). */
export const movedTo = (hash: string): string =>
  hash === '#/free' ? freePlayHref(getSettings().freePlayTab) : (MOVED[hash] ?? hash);

/** Cubed's chunk: its screens, its list and pack, and its styles (not three.js). */
const loadCubed = () => import('./cubed/routes');
/**
 * The 2D game's run: its hub, its fights, and the fight engine they play on (the story's
 * battle, the grid's codec and step). Fights happen only in a run, so none of it is in the
 * first download; the list's run banner (ui/screens/run/banner.ts) reads only the save.
 */
const loadRun = () => import('./ui/screens/run');

/** A route, typed by what its `match` finds. */
const route = <T>(r: Route<T>): Route => r as Route;
/** Exactly this hash. */
const is = (hash: string) => (h: string) => h === hash;

export const ROUTES: Route[] = [
  route({
    match: (h) => getPuzzle(/^#\/play\/([\w-]+)$/.exec(h)?.[1] ?? ''),
    render: (app, puzzle) => renderGameScreen(app, puzzle, freePlaySession(puzzle)),
  }),
  route({
    match: (h) => getScene(/^#\/scene\/([\w-]+)$/.exec(h)?.[1] ?? ''),
    render: (app, scene) => renderSceneScreen(app, scene),
  }),
  route({
    // A mural's tiles (#/mural/<id>), or tile n of it (#/mural/<id>/<n>).
    match: (h) => {
      const m = /^#\/mural\/([\w-]+)(?:\/(\d+))?$/.exec(h);
      const mural = m && getMural(m[1]);
      if (!mural) return null;
      const tile = m[2] ? Number(m[2]) - 1 : null;
      return tile === null || mural.tiles[tile] ? { mural, tile } : null;
    },
    render: (app, { mural, tile }) =>
      tile === null ? renderMuralScreen(app, mural) : renderMuralTile(app, mural, tile),
  }),
  // The one daily (#156): Flat and Cubed by turns. A Cubed day's is Cubed's daily screen.
  route({
    game: 'cubed',
    match: (h) => h === '#/daily' && dailyDimension(dateKey()) === 'block',
    render: (app, _, lazy) => lazy(loadCubed(), (m) => m.renderCubed(app, '/daily', lazy)),
  }),
  route({ match: is('#/daily'), render: (app) => renderDailyScreen(app) }),
  // The story's run (#/run) and its fights (#/run/play): the fight engine loads with them.
  route({
    match: is('#/run'),
    render: (app, _, lazy) => lazy(loadRun(), (m) => m.renderRunScreen(app)),
  }),
  route({
    match: is('#/run/play'),
    render: (app, _, lazy) => lazy(loadRun(), (m) => m.renderRunEncounter(app)),
  }),
  // Endless (#68): the jobs board, at its Endless section.
  route({
    match: is('#/endless'),
    render: (app, _, lazy) =>
      lazy(loadRun(), (m) => {
        const cleanup = m.renderRunScreen(app);
        app.querySelector('.chapter.endless')?.scrollIntoView({ block: 'start' });
        return cleanup;
      }),
  }),
  route({ match: is('#/badges'), render: (app) => renderBadgesScreen(app) }),
  route({
    match: is('#/settings'),
    render: (app, _, lazy) =>
      lazy(import('./ui/screens/settings'), (m) => m.renderSettingsScreen(app)),
  }),
  route({ match: is('#/how-to-play'), render: (app) => renderHowToPlay(app) }),
  route({ match: is('#/editor'), render: (app) => renderEditorScreen(app) }),
  // Free play (#153): a tab per board. The Cubed tab is Cubed's list, so it's Cubed's route.
  route({
    match: is('#/free/flat'),
    render: (app, _, lazy) => renderFreePlay(app, 'flat', loadCubed, lazy),
  }),
  route({
    game: 'cubed',
    match: is('#/free/cubed'),
    render: (app, _, lazy) => renderFreePlay(app, 'cubed', loadCubed, lazy),
  }),
  route({
    // Picross Cubed: #/cubed is its list, #/cubed/play/<id> a puzzle, and so on (cubed/routes.ts).
    game: 'cubed',
    match: (h) => /^#\/cubed(\/.*)?$/.exec(h),
    render: (app, [, path = '/'], lazy) => lazy(loadCubed(), (m) => m.renderCubed(app, path, lazy)),
  }),
  // Anything else: the home screen, one menu for both boards (#152).
  route({ match: () => true, render: (app) => renderHome(app) }),
];
