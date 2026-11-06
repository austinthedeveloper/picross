import { randomUnsolved } from '../../game/pickPuzzle';
import { getOverallStats, getPuzzleStats, getSavedBoard } from '../../game/progress';
import {
  getSettings,
  inListOrder,
  inPuzzleOrder,
  passesFilter,
  updateSettings,
  type DifficultyFilter,
  type ListFilter,
  type ListOrder,
  type Mode,
} from '../../game/settings';
import { DIFFICULTIES, puzzleDifficulty, puzzlePasses } from '../../puzzles/difficulty';
import { puzzles } from '../../puzzles/index';
import type { Puzzle } from '../../puzzles/format';
import { createPicture } from '../board/picture';
import { listSection } from '../components/listSection';
import { createMuteButton } from '../components/muteButton';
import { rankCard } from '../components/rankCard';
import { el } from '../dom';
import { formatTime } from '../format';
import { applyTheme } from '../theme';
import { dailyCard } from './daily';
import { muralSection } from './mural';
import { runBanner } from './run';

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

const EMPTY_LIST: Record<ListFilter, string> = {
  all: '',
  todo: 'You’ve completed everything. Well done.',
  done: 'Nothing completed yet. Pick a puzzle and get going.',
};

const MODE_HINTS: Record<Mode, string> = {
  relaxed: 'No checking. Solve at your own pace.',
  hearts: 'Wrong fills cost a heart. Three and you start over.',
};

/** One puzzle card. The picture and name stay hidden until it's solved. */
function puzzleCard(p: Puzzle, number: number): HTMLElement {
  const stats = getPuzzleStats(p.id);
  const difficulty = puzzleDifficulty(p.id);
  const status = stats
    ? `✓ ${formatTime(stats.bestTime)}`
    : getSavedBoard(p.id)
      ? 'In progress'
      : 'Unsolved';
  const thumb = stats
    ? createPicture(p.solution, Math.floor(60 / Math.max(p.width, p.height)))
    : el('span', { className: 'thumb-unknown', textContent: '?' });
  return el('a', { className: `card${stats ? ' solved' : ''}`, href: `#/play/${p.id}` }, [
    el('div', { className: 'thumb' }, [thumb]),
    el('div', { className: 'card-name', textContent: stats ? p.name : `No. ${number}` }),
    el('div', { className: 'card-meta' }, [
      el('span', { className: 'card-size' }, [
        `${p.width}×${p.height} · `,
        el('span', {
          className: `difficulty ${difficulty.id}`,
          textContent: difficulty.label,
        }),
      ]),
      el('span', { className: 'status', textContent: status }),
    ]),
  ]);
}

/**
 * The puzzle list grouped by size. Cards keep their pack-wide number whatever
 * the order, and the headings count the whole size whatever the filter hides.
 */
function sizeSections(
  filter: ListFilter,
  order: ListOrder,
  difficulty: DifficultyFilter,
): HTMLElement[] {
  const sizes = [...new Set(puzzles.map((p) => p.width))].sort((a, b) => a - b);
  return inListOrder(order, sizes).flatMap((size) => {
    const group = puzzles.filter((p) => p.width === size);
    const solved = group.filter((p) => getPuzzleStats(p.id)).length;
    const shown = group.filter(
      (p) =>
        passesFilter(filter, Boolean(getPuzzleStats(p.id))) &&
        (difficulty === 'any' || puzzleDifficulty(p.id).id === difficulty),
    );
    if (!shown.length) return [];
    return listSection({
      id: `size-${size}`,
      label: `${size}×${size} puzzles`,
      heading: `${size}×${size}`,
      count: `${solved}/${group.length}`,
      content: el(
        'div',
        { className: 'cards' },
        inPuzzleOrder(order, shown, (p) => puzzlePasses(p.id)).map((p) =>
          puzzleCard(p, puzzles.indexOf(p) + 1),
        ),
      ),
    });
  });
}

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
  // Murals aren't rated, so a difficulty filter leaves them out.
  const murals = difficulty === 'any' ? muralSection(filter, order) : null;
  const list = [murals, ...sizeSections(filter, order, difficulty)].flatMap((s) => s ?? []);

  app.replaceChildren(
    el('main', { className: 'screen select' }, [
      el('header', { className: 'topbar' }, [
        el('h1', { textContent: 'Picross' }),
        el('div', { className: 'settings' }, [
          createMuteButton(),
          toggle('◐ High contrast', settings.highContrast, () => {
            updateSettings({ highContrast: !settings.highContrast });
            applyTheme();
            rerender();
          }),
        ]),
      ]),
      dailyCard(),
      runBanner(),
      el('a', {
        className: 'how-to-link',
        href: '#/how-to-play',
        textContent: overall.solves ? 'How to play →' : 'New to picross? Learn it in a minute →',
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
      ...(list.length
        ? list
        : [
            el('p', {
              className: 'empty-list',
              textContent:
                difficulty === 'any' ? EMPTY_LIST[filter] : 'No puzzles match those filters.',
            }),
          ]),
      el('footer', { className: 'footer' }, [
        el('a', { href: '#/editor', textContent: 'Make your own puzzle →' }),
      ]),
    ]),
  );
}
