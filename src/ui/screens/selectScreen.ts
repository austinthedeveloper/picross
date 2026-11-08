import { dimsLabel } from '../../engine/volume';
import { getOverallStats, getPuzzleStats, getSavedBoard } from '../../game/progress';
import { getSettings, updateSettings, type ListFilter, type Mode } from '../../game/settings';
import { BANDS, difficultyOf } from '../../puzzles/difficulty';
import type { Puzzle } from '../../puzzles/format';
import { PUZZLES } from '../../puzzles/index';
import { blockOutline, shapePicture } from '../board/thumbnail';
import { createMuteButton } from '../components/muteButton';
import { el } from '../dom';
import { formatTime, puzzleNumber } from '../format';
import { hapticsSupported } from '../haptics';
import { applyTheme } from '../theme';

/** The list's sections, by the longest side of the block. */
const SECTIONS = [
  { id: 'small', title: 'Small', max: 4 },
  { id: 'medium', title: 'Medium', max: 6 },
  { id: 'large', title: 'Large', max: 8 },
  { id: 'huge', title: 'Huge', max: Infinity },
];

const longest = (p: Puzzle) => Math.max(p.dims.x, p.dims.y, p.dims.z);

/**
 * Cards other screens add to the top of the list (the story, the daily puzzle), each
 * built fresh when the list renders.
 */
const extraCards: (() => HTMLElement | null)[] = [];
export function addListCard(card: () => HTMLElement | null): void {
  extraCards.push(card);
}

function card(puzzle: Puzzle, index: number): HTMLElement {
  const stats = getPuzzleStats(puzzle.id);
  const saved = getSavedBoard(puzzle.id);
  const band = difficultyOf(puzzle);
  const picture = stats ? shapePicture(puzzle, 88) : blockOutline(puzzle.dims, 88);
  const meta = stats
    ? `${dimsLabel(puzzle.dims)} · ${formatTime(stats.bestTime)}`
    : saved
      ? `${dimsLabel(puzzle.dims)} · in progress`
      : dimsLabel(puzzle.dims);
  return el(
    'a',
    { className: `puzzle-card${stats ? ' solved' : ''}`, href: `#/play/${puzzle.id}` },
    [
      el('div', { className: 'thumb' }, [picture]),
      el('span', {
        className: 'card-name',
        textContent: stats ? puzzle.name : puzzleNumber(index),
      }),
      el('span', { className: 'card-meta', textContent: meta }),
      el('span', { className: `card-band band-${band.id}`, textContent: band.label }),
    ],
  );
}

function toggle(label: string, on: () => boolean, set: (v: boolean) => void): HTMLButtonElement {
  const button = el('button', { className: 'toggle', textContent: label });
  const render = () => button.setAttribute('aria-pressed', String(on()));
  button.onclick = () => {
    set(!on());
    render();
  };
  render();
  return button;
}

/** A row of joined buttons where one is chosen. */
function choice<T extends string>(
  label: string,
  options: { id: T; label: string; title?: string }[],
  current: () => T,
  pick: (id: T) => void,
): HTMLElement {
  const buttons = options.map((o) =>
    el('button', {
      className: 'toggle',
      textContent: o.label,
      title: o.title ?? '',
      onclick: () => {
        pick(o.id);
        render();
      },
    }),
  );
  const render = () =>
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].id === current())));
  render();
  return el('div', { className: 'segmented', role: 'group', ariaLabel: label }, buttons);
}

/** The tutorial offer, until it's been done (or the player has solved something). */
function tutorialCard(): HTMLElement | null {
  if (getSettings().tutorialDone || getOverallStats().solved > 0) return null;
  return el('div', { className: 'feature-card tutorial-card' }, [
    el('div', {}, [
      el('p', { className: 'kicker', textContent: 'New here?' }),
      el('p', { textContent: 'Learn the clues on a little block, one step at a time.' }),
    ]),
    el('div', { className: 'feature-actions' }, [
      el('button', {
        className: 'button ghost',
        textContent: 'Not now',
        onclick: (e: Event) => {
          updateSettings({ tutorialDone: true });
          (e.target as HTMLElement).closest('.tutorial-card')?.remove();
        },
      }),
      el('a', { className: 'button primary', href: '#/tutorial', textContent: 'Start' }),
    ]),
  ]);
}

/** The puzzle list, settings and stats (#/). */
export function renderSelectScreen(root: HTMLElement): void {
  const rerender = () => renderSelectScreen(root);
  const stats = getOverallStats();
  const shows = (p: Puzzle) => {
    const { listFilter: f, listDifficulty: d } = getSettings();
    const solved = Boolean(getPuzzleStats(p.id));
    return (f === 'all' || (f === 'done') === solved) && (d === 'any' || difficultyOf(p).id === d);
  };

  const sections = SECTIONS.map((section, s) => {
    const min = s ? SECTIONS[s - 1].max : 0;
    const all = PUZZLES.filter((p) => longest(p) > min && longest(p) <= section.max);
    const shown = all.filter(shows);
    if (!shown.length) return null;
    const solved = all.filter((p) => getPuzzleStats(p.id)).length;
    return el('section', { className: 'list-section' }, [
      el('h2', {}, [
        section.title,
        el('span', { className: 'count', textContent: ` ${solved}/${all.length}` }),
      ]),
      el(
        'div',
        { className: 'puzzle-grid' },
        shown.map((p) => card(p, PUZZLES.indexOf(p))),
      ),
    ]);
  }).filter((s): s is HTMLElement => s !== null);

  const modes: { id: Mode; label: string; title: string }[] = [
    { id: 'relaxed', label: 'Relaxed', title: 'Nothing is checked as you go' },
    { id: 'hearts', label: 'Hearts', title: 'Breaking a cube of the shape costs a heart' },
  ];
  const filters: { id: ListFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To do' },
    { id: 'done', label: 'Done' },
  ];
  const difficulty = el('select', { className: 'difficulty-filter' }, [
    el('option', { value: 'any', textContent: 'Any difficulty' }),
    ...BANDS.map((b) => el('option', { value: b.id, textContent: b.label })),
  ]);
  difficulty.ariaLabel = 'Difficulty';
  difficulty.value = getSettings().listDifficulty;
  difficulty.onchange = () => {
    updateSettings({ listDifficulty: difficulty.value });
    rerender();
  };

  root.replaceChildren(
    el('div', { className: 'screen select' }, [
      el('header', { className: 'topbar' }, [
        el('h1', { textContent: 'Picross Cubed' }),
        el('a', { className: 'button ghost', href: '#/editor', textContent: 'Editor' }),
        el('a', { className: 'button ghost', href: '#/how-to-play', textContent: 'How to play' }),
      ]),
      el('p', {
        className: 'lede',
        textContent: 'Each block hides a shape. Break away every cube that isn’t part of it.',
      }),
      ...[tutorialCard, ...extraCards].map((make) => make()).filter((c): c is HTMLElement => !!c),
      el('div', { className: 'settings' }, [
        choice(
          'Mode',
          modes,
          () => getSettings().mode,
          (mode) => updateSettings({ mode }),
        ),
        createMuteButton(),
        toggle(
          'High contrast',
          () => getSettings().highContrast,
          (v) => {
            updateSettings({ highContrast: v });
            applyTheme();
            rerender();
          },
        ),
        toggle(
          'Fade finished lines',
          () => getSettings().dimDone,
          (v) => updateSettings({ dimDone: v }),
        ),
        ...(hapticsSupported()
          ? [
              toggle(
                'Haptics',
                () => getSettings().haptics,
                (v) => updateSettings({ haptics: v }),
              ),
            ]
          : []),
      ]),
      el('p', {
        className: 'stats',
        textContent: `${stats.solved}/${PUZZLES.length} solved · ${formatTime(stats.totalTime)} played`,
      }),
      el('div', { className: 'filters' }, [
        choice(
          'Show',
          filters,
          () => getSettings().listFilter,
          (listFilter) => {
            updateSettings({ listFilter });
            rerender();
          },
        ),
        difficulty,
      ]),
      ...(sections.length
        ? sections
        : [
            el('p', {
              className: 'empty-list',
              textContent: 'No puzzles match. Try another filter.',
            }),
          ]),
    ]),
  );
}
