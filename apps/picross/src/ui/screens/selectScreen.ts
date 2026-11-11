import { randomUnsolved } from '../../game/pickPuzzle';
import { gameSwitch } from '@picross/shared/ui/components/gameSwitch';
import { freePlayHref } from '../../game/freePlay';
import { getOverallStats, getPuzzleStats } from '../../game/progress';
import {
  getSettings,
  updateSettings,
  type DifficultyFilter,
  type ListFilter,
  type ListOrder,
  type Mode,
} from '../../game/settings';
import { DIFFICULTIES } from '@picross/grid/puzzles/difficulty';
import { puzzles } from '@picross/grid/puzzles/index';
import { rankCard } from '../components/rankCard';
import { settingsLink } from '../components/settingsLink';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '@picross/shared/ui/format';
import { dailyCard } from './daily';
import { puzzleList } from './puzzleList';
import { runBanner } from './run/banner';

const FILTERS: [ListFilter, string][] = [
  ['all', 'All'],
  ['todo', 'Not completed'],
  ['done', 'Completed'],
];

const ORDERS: [ListOrder, string][] = [
  ['asc', 'Smallest first'],
  ['desc', 'Largest first'],
  ['easiest', 'Easiest first'],
  ['hardest', 'Hardest first'],
];

const MODE_HINTS: Record<Mode, string> = {
  relaxed: 'No checking. Solve at your own pace.',
  hearts: 'Wrong fills cost a heart. Three and you start over.',
};

/** Shows only one difficulty of puzzle (#112). */
function difficultySelect(current: DifficultyFilter, rerender: () => void): HTMLSelectElement {
  const options = [
    el('option', { value: 'any', textContent: 'Any' }),
    ...DIFFICULTIES.map((band) => el('option', { value: band.id, textContent: band.label })),
  ];
  const select = el('select', {
    onchange: () => {
      updateSettings({ listDifficulty: select.value as DifficultyFilter });
      rerender();
    },
  });
  select.append(...options);
  select.value = current;
  return select;
}

/** Opens a random unsolved puzzle (#114). Gone once everything's solved. */
function surpriseButton(): HTMLElement[] {
  const isSolved = (id: string) => Boolean(getPuzzleStats(id));
  if (!randomUnsolved(puzzles, isSolved)) return [];
  return [
    el('button', {
      className: 'button ghost surprise',
      textContent: 'Surprise me',
      onclick: () => {
        const pick = randomUnsolved(puzzles, isSolved);
        if (pick) location.hash = `#/play/${pick.id}`;
      },
    }),
  ];
}

/** Renders the puzzle list with settings, mode choice, and stats. */
export function renderSelectScreen(app: HTMLElement): void {
  const rerender = () => renderSelectScreen(app);
  const settings = getSettings();

  const toggle = (label: string, pressed: boolean, onClick: () => void, title?: string) => {
    const button = el('button', { className: 'toggle', textContent: label, onclick: onClick });
    if (title) button.title = title;
    button.setAttribute('aria-pressed', String(pressed));
    return button;
  };
  const modeButton = (mode: Mode, label: string, title: string) =>
    toggle(label, settings.mode === mode, () => (updateSettings({ mode }), rerender()), title);

  const stat = (value: string, label: string) =>
    el('div', { className: 'stat' }, [
      el('strong', { textContent: value }),
      el('span', { textContent: label }),
    ]);
  const overall = getOverallStats();
  const filter = settings.listFilter;
  const order = settings.listOrder;
  const difficulty = settings.listDifficulty;

  app.replaceChildren(
    el('main', { className: 'screen select' }, [
      gameSwitch('flat'),
      el('header', { className: 'topbar' }, [
        el('h1', { textContent: 'Picross' }),
        // Sound, high contrast and haptics are on the settings screen (#154).
        el('div', { className: 'settings' }, [settingsLink()]),
      ]),
      dailyCard(),
      runBanner(),
      el('a', {
        className: 'how-to-link',
        href: '#/how-to-play',
        textContent: overall.solves ? 'How to play →' : 'New to picross? Learn it in a minute →',
      }),
      // Both boards' puzzles in one place, with size filters (#153).
      el('a', {
        className: 'free-play-link',
        href: freePlayHref('flat'),
        textContent: 'Free play: Flat and Cubed puzzles in one list →',
      }),
      el('div', { className: 'mode-row' }, [
        el('div', { className: 'segmented', role: 'group', ariaLabel: 'Mode' }, [
          modeButton('relaxed', 'Relaxed', 'No checking'),
          modeButton('hearts', '♥ Hearts', 'Wrong fills cost a heart'),
        ]),
        el('span', { className: 'mode-hint', textContent: MODE_HINTS[settings.mode] }),
      ]),
      rankCard(),
      ...surpriseButton(),
      el('section', { className: 'stats', ariaLabel: 'Stats' }, [
        // Mural tiles share the save, so count pack puzzles only.
        stat(
          `${puzzles.filter((p) => getPuzzleStats(p.id)).length}/${puzzles.length}`,
          'Puzzles solved',
        ),
        stat(String(overall.solves), 'Total solves'),
        stat(formatTime(overall.totalTime), 'Time solving'),
      ]),
      el('div', { className: 'filter-row' }, [
        el(
          'div',
          { className: 'segmented', role: 'group', ariaLabel: 'Show puzzles' },
          FILTERS.map(([value, label]) =>
            toggle(label, filter === value, () => {
              updateSettings({ listFilter: value });
              rerender();
            }),
          ),
        ),
        el(
          'div',
          { className: 'segmented', role: 'group', ariaLabel: 'Sort puzzles' },
          ORDERS.map(([value, label]) =>
            toggle(label, order === value, () => {
              updateSettings({ listOrder: value });
              rerender();
            }),
          ),
        ),
        el('label', { className: 'difficulty-filter' }, [
          'Difficulty ',
          difficultySelect(difficulty, rerender),
        ]),
      ]),
      // The home list shows every size: free play (#/free/flat) is where sizes filter.
      ...puzzleList({ filter, order, difficulty, size: 'any' }),
      el('footer', { className: 'footer' }, [
        el('a', { href: '#/editor', textContent: 'Make your own puzzle →' }),
      ]),
    ]),
  );
}
