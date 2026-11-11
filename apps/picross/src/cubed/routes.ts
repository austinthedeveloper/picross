/**
 * Picross Cubed, the 3D game, under `#/cubed/…`. The app's router (../routes.ts) loads this
 * module with one `import()` the first time a Cubed route opens, so the 3D game's list, pack
 * and styles stay out of the first download; the screens with a block (three.js) load on
 * demand from here.
 */
import './styles/select.css';
import '@picross/play-block/styles/editor.css';
import { getPuzzle } from '@picross/block/puzzles/index';
import { providePrefs } from '@picross/shared/game/prefs';
import { applyTheme } from '@picross/shared/ui/theme';
import { providePlayPrefs } from '@picross/play-block/ui/prefs';
import { getSettings, updateSettings } from './game/settings';
import { cubedHref } from './href';
import type { Lazy, Screen } from '../routes';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { addListCard, renderSelectScreen } from './ui/screens/selectScreen';
import { renderStoryScreen, storyCard } from './ui/screens/story/index';
import { dailyCard } from './ui/screens/dailyCard';
import { renderBadgesScreen } from './ui/screens/badgesScreen';

addListCard(dailyCard);
addListCard(storyCard);

/** One of Cubed's screens: `match` reads the path after `#/cubed`. */
interface CubedRoute {
  match: RegExp;
  render(app: HTMLElement, found: RegExpExecArray, lazy: Lazy): Screen;
}

const ROUTES: CubedRoute[] = [
  {
    match: /^\/play\/([\w-]+)$/,
    render: (app, [, id], lazy) => {
      const puzzle = getPuzzle(id);
      if (!puzzle) return renderSelectScreen(app);
      return lazy(import('./ui/screens/gameScreen'), (m) => m.renderGameScreen(app, puzzle));
    },
  },
  {
    match: /^\/tutorial$/,
    render: (app, _, lazy) => lazy(import('./ui/screens/tutorial'), (m) => m.renderTutorial(app)),
  },
  {
    // Not a link of its own: the app's #/daily opens this on a Cubed day (#156), and
    // #/cubed/daily, the old link, moves there (../routes.ts).
    match: /^\/daily$/,
    render: (app, _, lazy) =>
      lazy(import('./ui/screens/dailyScreen'), (m) => m.renderDailyScreen(app)),
  },
  { match: /^\/badges$/, render: (app) => renderBadgesScreen(app) },
  {
    match: /^\/diorama\/([\w-]+)(?:\/(\d+))?$/,
    render: (app, [, id, n], lazy) =>
      lazy(import('./ui/screens/dioramaScreen'), (m) =>
        n ? m.renderDioramaTile(app, id, Number(n)) : m.renderDioramaScreen(app, id),
      ),
  },
  { match: /^\/story$/, render: (app) => renderStoryScreen(app) },
  {
    match: /^\/story\/play$/,
    render: (app, _, lazy) =>
      lazy(import('./ui/screens/story/encounter'), (m) => m.renderEncounter(app)),
  },
  {
    match: /^\/editor$/,
    render: (app, _, lazy) =>
      lazy(import('@picross/play-block/ui/screens/editor/editorScreen'), (m) =>
        m.renderEditorScreen(app, {
          home: cubedHref(),
          sharedHref: (code) => cubedHref(`/p/${code}`),
        }),
      ),
  },
  {
    match: /^\/p\/([\w-]+)(\/test)?$/,
    render: (app, [, code, test], lazy) =>
      lazy(import('./ui/screens/sharedScreen'), (m) =>
        m.renderSharedScreen(app, code, Boolean(test)),
      ),
  },
  { match: /^\/how-to-play$/, render: (app) => renderHowToPlay(app) },
];

/**
 * Cubed's settings are a view of the one set (`game/settings.ts`, #155), which shared code
 * (sound, haptics, the theme, the mute button) and the play screen read on its routes.
 */
function useCubedSettings(): void {
  providePrefs({ get: getSettings, update: updateSettings });
  providePlayPrefs(getSettings);
  applyTheme();
}

/** Draws the Cubed screen at `path` (the hash after `#/cubed`); its list for anything else. */
export function renderCubed(app: HTMLElement, path: string, lazy: Lazy): Screen {
  useCubedSettings();
  for (const route of ROUTES) {
    const found = route.match.exec(path);
    if (found) return route.render(app, found, lazy);
  }
  return renderSelectScreen(app);
}
