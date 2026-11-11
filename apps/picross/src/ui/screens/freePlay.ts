/**
 * Free play (#153): both packs, a tab each, `#/free/flat` and `#/free/cubed`. The tabs share
 * their filters (the settings' `listFilter`, `listSize`, `listDifficulty`), and Next unsolved
 * and Surprise me pick from the tab's list, or from both with "Both boards".
 *
 * One tab draws at a time. The Cubed tab's list is Cubed's own (cubed/routes.ts), which loads
 * with Cubed's chunk (no three.js), and its route puts `<html data-board="block">` up, so its
 * cards keep Cubed's styles; the tabs, filters and pickers above it are unscoped
 * (styles/freePlay.css) and look the same on both.
 */
import {
  freePlayHref,
  nextOfBoth,
  SIZE_BANDS,
  surpriseOfBoth,
  type Candidate,
  type FreePlayTab,
  type SizeBand,
} from '../../game/freePlay';
import {
  getSettings,
  updateSettings,
  type DifficultyFilter,
  type ListFilter,
  type ListOrder,
} from '../../game/settings';
import { DIFFICULTIES } from '@picross/grid/puzzles/difficulty';
import { gameHref } from '@picross/shared/ui/components/gameSwitch';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import type { Lazy, Screen } from '../../routes';
import { puzzleList, unsolvedPuzzles } from './puzzleList';

/** What free play needs from Cubed (cubed/routes.ts, loaded with Cubed's chunk). */
export interface CubedFreePlay {
  /** The Cubed tab's list. Puts Cubed's settings up, so only for the Cubed tab. */
  freePlayList(size: SizeBand): HTMLElement[];
  freePlayPicks(size: SizeBand): Candidate[];
}

/** Cubed's half, once its chunk has loaded. */
let cubed: CubedFreePlay | undefined;

const TABS: { id: FreePlayTab; label: string; hint: string }[] = [
  { id: 'flat', label: 'Flat', hint: '2D grids' },
  { id: 'cubed', label: 'Cubed', hint: '3D blocks' },
];

const SHOW: [ListFilter, string][] = [
  ['all', 'All'],
  ['todo', 'Unsolved'],
  ['done', 'Solved'],
];

const ORDERS: [ListOrder, string][] = [
  ['asc', 'Smallest first'],
  ['desc', 'Largest first'],
  ['easiest', 'Easiest first'],
  ['hardest', 'Hardest first'],
];

/** A labelled dropdown; picking an option saves it and draws the screen again. */
function dropdown(
  label: string,
  options: [string, string][],
  value: string,
  pick: (value: string) => void,
): HTMLElement {
  const select = el(
    'select',
    { onchange: () => pick(select.value) },
    options.map(([v, text]) => el('option', { value: v, textContent: text })),
  );
  select.value = value;
  return el('label', { className: 'free-select' }, [label, select]);
}

function tabBar(current: FreePlayTab): HTMLElement {
  // The Flat | Cubed switch's look (base.css), as links: each tab is its own route.
  return el(
    'nav',
    { className: 'game-switch free-tabs', ariaLabel: 'Board' },
    TABS.map(({ id, label, hint }) => {
      const link = el('a', { className: 'game-option', href: freePlayHref(id) }, [
        el('span', { className: 'game-label', textContent: label }),
        el('span', { className: 'game-hint', textContent: hint }),
      ]);
      if (id === current) link.setAttribute('aria-current', 'page');
      return link;
    }),
  );
}

/**
 * The tab at `#/free/<tab>`. `loadCubed` loads Cubed's chunk (routes.ts), for the Cubed tab
 * and for picking from both boards on the Flat tab.
 */
export function renderFreePlay(
  app: HTMLElement,
  tab: FreePlayTab,
  loadCubed: () => Promise<CubedFreePlay>,
  lazy: Lazy,
): Screen {
  if (getSettings().freePlayTab !== tab) updateSettings({ freePlayTab: tab });
  const load = () => (cubed ? Promise.resolve(cubed) : loadCubed().then((m) => (cubed = m)));
  // The list draws with the rest, once Cubed's chunk is in (it's precached with the app).
  if (tab === 'cubed' && !cubed) return lazy(load(), () => drawFreePlay(app, tab, load));
  drawFreePlay(app, tab, load);
}

function drawFreePlay(
  app: HTMLElement,
  tab: FreePlayTab,
  load: () => Promise<CubedFreePlay>,
): void {
  const redraw = () => drawFreePlay(app, tab, load);
  const settings = getSettings();
  const size = settings.listSize;
  const view = {
    filter: settings.listFilter,
    order: settings.listOrder,
    difficulty: settings.listDifficulty,
    size,
  };
  const set = (patch: Parameters<typeof updateSettings>[0]) => {
    updateSettings(patch);
    // Only while this screen is up: a change can land as the route moves on.
    if (screen.isConnected) redraw();
  };

  const flatPicks = () => unsolvedPuzzles(view);
  const here = tab === 'flat' ? flatPicks() : cubed!.freePlayPicks(size);
  const both = settings.pickBoth;
  // The other board's picks: on the Flat tab, unknown until Cubed's chunk is in, so picking
  // from both starts loading it now, and a click waits for it if it must.
  if (both && !cubed) void load();
  const other = both ? (tab === 'cubed' ? flatPicks() : cubed?.freePlayPicks(size)) : [];
  const there = async () => other ?? (await load()).freePlayPicks(size);
  /** Nothing to pick, here or (picking from both) on the other board. */
  const none = !here.length && other?.length === 0;
  const pickButton = (label: string, choose: (other: Candidate[]) => Candidate | null) =>
    el('button', {
      className: 'button ghost',
      textContent: label,
      disabled: none,
      title: none ? 'Everything these filters show is solved' : '',
      onclick: async () => {
        const pick = choose(await there());
        if (pick) location.hash = pick.href;
      },
    });

  // Cubed has no band past expert: its list shows Flat's insane as expert.
  const bands = tab === 'flat' ? DIFFICULTIES : DIFFICULTIES.filter((d) => d.id !== 'insane');
  const difficulty =
    tab === 'cubed' && settings.listDifficulty === 'insane' ? 'expert' : settings.listDifficulty;
  const bothToggle = el('button', {
    className: 'toggle',
    textContent: 'Both boards',
    title: 'Next unsolved and Surprise me pick from Flat and Cubed',
    onclick: () => set({ pickBoth: !both }),
  });
  bothToggle.setAttribute('aria-pressed', String(both));

  const screen = el('main', { className: 'screen free-play' });
  app.replaceChildren(screen);
  screen.append(
    el('header', { className: 'topbar' }, [
      homeLink(gameHref(tab)),
      el('h1', { textContent: 'Free play' }),
    ]),
    tabBar(tab),
    el('div', { className: 'free-filters' }, [
      el(
        'div',
        { className: 'segmented', role: 'group', ariaLabel: 'Show puzzles' },
        SHOW.map(([value, label]) => {
          const button = el('button', {
            className: 'toggle',
            textContent: label,
            onclick: () => set({ listFilter: value }),
          });
          button.setAttribute('aria-pressed', String(settings.listFilter === value));
          return button;
        }),
      ),
      el('div', { className: 'free-selects' }, [
        dropdown(
          'Size',
          [
            ['any', 'Any'],
            ...SIZE_BANDS.map(({ id, label, flat, cubed }): [string, string] => [
              id,
              `${label} (${tab === 'flat' ? flat : cubed})`,
            ]),
          ],
          size,
          (value) => set({ listSize: value as SizeBand }),
        ),
        dropdown(
          'Difficulty',
          [['any', 'Any'], ...bands.map((b): [string, string] => [b.id, b.label])],
          difficulty,
          (value) => set({ listDifficulty: value as DifficultyFilter }),
        ),
        // Only Flat's list sorts; Cubed's runs by size, then difficulty.
        ...(tab === 'flat'
          ? [
              dropdown('Sort', ORDERS, settings.listOrder, (value) =>
                set({ listOrder: value as ListOrder }),
              ),
            ]
          : []),
      ]),
    ]),
    el('div', { className: 'free-picks' }, [
      pickButton('Next unsolved', (other) =>
        both ? nextOfBoth(here[0] ?? null, other[0] ?? null) : (here[0] ?? null),
      ),
      pickButton('Surprise me', (other) => surpriseOfBoth(here, other)),
      bothToggle,
    ]),
    el(
      'div',
      { className: 'free-list' },
      tab === 'flat' ? puzzleList(view) : cubed!.freePlayList(size),
    ),
  );
}
