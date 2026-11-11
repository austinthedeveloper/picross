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
 * (#157).
 */
import { getPuzzle } from '@picross/grid/puzzles/index';
import { getMural } from '@picross/grid/puzzles/murals';
import { getScene } from '@picross/story/puzzles/scenes';
import { dailyDimension, dateKey } from '@picross/shared/puzzles/days';
import { renderGameScreen } from '@picross/play-grid/ui/screens/gameScreen';
import { renderSceneScreen } from '@picross/story/ui/screens/sceneScreen';
import { renderBadgesScreen } from './ui/screens/badges';
import { renderDailyScreen } from './ui/screens/daily';
import { renderEditorScreen } from './ui/screens/editorScreen';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { renderMuralScreen, renderMuralTile } from './ui/screens/mural';
import { freePlaySession } from './ui/screens/freePlaySession';
import { renderRunEncounter, renderRunScreen } from './ui/screens/run';
import { renderSelectScreen } from './ui/screens/selectScreen';

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
};

/** Where `hash` goes now: itself, unless it's an old link. */
export const movedTo = (hash: string): string => MOVED[hash] ?? hash;

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
    render: (app, _, lazy) =>
      lazy(import('./cubed/routes'), (m) => m.renderCubed(app, '/daily', lazy)),
  }),
  route({ match: is('#/daily'), render: (app) => renderDailyScreen(app) }),
  route({ match: is('#/run'), render: (app) => renderRunScreen(app) }),
  route({ match: is('#/run/play'), render: (app) => renderRunEncounter(app) }),
  route({ match: is('#/badges'), render: (app) => renderBadgesScreen(app) }),
  route({ match: is('#/how-to-play'), render: (app) => renderHowToPlay(app) }),
  route({ match: is('#/editor'), render: (app) => renderEditorScreen(app) }),
  route({
    // Picross Cubed: #/cubed is its list, #/cubed/play/<id> a puzzle, and so on (cubed/routes.ts).
    game: 'cubed',
    match: (h) => /^#\/cubed(\/.*)?$/.exec(h),
    render: (app, [, path = '/'], lazy) =>
      lazy(import('./cubed/routes'), (m) => m.renderCubed(app, path, lazy)),
  }),
  // Anything else: the puzzle list.
  route({ match: () => true, render: (app) => renderSelectScreen(app) }),
];
