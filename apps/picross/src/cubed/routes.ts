/**
 * Picross Cubed, the 3D game, under `#/cubed/…`. The app's router (../routes.ts) loads this
 * module with one `import()` the first time a Cubed route opens, so the 3D game's list, pack
 * and styles stay out of the first download; the screens with a block (three.js) load on
 * demand from here.
 */
import './styles/select.css';
import '@picross/play-block/styles/editor.css';
import { getPuzzle } from '@picross/block/puzzles/index';
import { buildModel } from '@picross/block/puzzles/trio';
import { parseBuildPath, startBuild } from '@picross/block/build/entry';
import { trioPicture } from '@picross/grid/puzzles/trio';
import { providePrefs } from '@picross/shared/game/prefs';
import { applyTheme } from '@picross/shared/ui/theme';
import { providePlayPrefs } from '@picross/play-block/ui/prefs';
import { getSettings, updateSettings } from './game/settings';
import { cubedHref, HOME, shareHref } from './href';
import { editorTabs } from '../ui/components/editorTabs';
import type { Lazy, Screen } from '../routes';
import { renderHowToPlay } from './ui/screens/howToPlay';
import { cubedStats, puzzleList, tutorialCard, unsolvedPuzzles } from './ui/screens/puzzleList';
import type { SizeBand } from '../game/freePlay';
import { renderStoryScreen } from './ui/screens/story/index';

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
      if (!puzzle) return location.replace(cubedHref());
      return lazy(import('./ui/screens/gameScreen'), (m) => m.renderGameScreen(app, puzzle));
    },
  },
  {
    // The trio's block (a prototype): carve it, then build it.
    match: /^\/trio\/([\w-]+)$/,
    render: (app, [, id], lazy) => {
      const puzzle = buildModel(id);
      if (!puzzle) return location.replace(cubedHref());
      return lazy(import('./ui/screens/trio'), (m) => m.renderTrioCarve(app, puzzle));
    },
  },
  {
    // The build: any puzzle's solved block, as bricks. Straight in for testing, with
    // ?layer=N to start partway (docs/cubed/how-to.md).
    match: /^\/build\/[\w-]+(?:\?.*)?$/,
    render: (app, [path], lazy) => {
      const entry = parseBuildPath(path);
      if (!entry || !buildModel(entry.id)) return location.replace(cubedHref());
      const draw = (m: typeof import('@picross/play-block/ui/screens/build')) => {
        const { puzzle, build } = startBuild(entry)!;
        const flat = trioPicture(entry.id)?.solution;
        return m.renderBuildScreen(app, {
          puzzle,
          build,
          flat,
          home: '#/',
          again: () => {
            cleanup?.();
            cleanup = draw(m);
          },
        });
      };
      let cleanup: (() => void) | undefined;
      return lazy(import('@picross/play-block/ui/screens/build'), (m) => {
        cleanup = draw(m);
        return () => cleanup?.();
      });
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
          home: HOME,
          sharedHref: shareHref,
          tabs: editorTabs('cubed'),
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

/**
 * Draws the Cubed screen at `path` (the hash after `#/cubed`). Anything else goes to its
 * list, free play's Cubed tab (#152).
 */
export function renderCubed(app: HTMLElement, path: string, lazy: Lazy): Screen {
  useCubedSettings();
  for (const route of ROUTES) {
    const found = route.match.exec(path);
    if (found) return route.render(app, found, lazy);
  }
  location.replace(cubedHref());
}

/** Free play's Cubed tab (#153, ui/screens/freePlay.ts): Cubed's list, with its settings up. */
export function freePlayList(size: SizeBand): HTMLElement[] {
  useCubedSettings();
  const tutorial = tutorialCard();
  return [...(tutorial ? [tutorial] : []), cubedStats(), ...puzzleList(size)];
}

/** The unsolved puzzles the Cubed tab shows, for Next unsolved and Surprise me. */
export const freePlayPicks = unsolvedPuzzles;
