import { dimsLabel } from '@picross/block/engine/volume';
import { gameSwitch } from '@picross/shared/ui/components/gameSwitch';
import { getOverallStats, getPuzzleStats, getSavedBoard } from '../../game/progress';
import { getSettings, updateSettings, type ListFilter, type Mode } from '../../game/settings';
import { BANDS, difficultyOf } from '@picross/block/puzzles/difficulty';
import type { Puzzle } from '@picross/block/puzzles/format';
import { PUZZLES } from '@picross/block/puzzles/index';
import { blockOutline, shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { createMuteButton } from '@picross/shared/ui/components/muteButton';
import { el } from '@picross/shared/ui/dom';
import { formatTime, puzzleNumber } from '@picross/play-block/ui/format';
import { hapticsSupported } from '@picross/shared/ui/haptics';
import { applyTheme } from '@picross/shared/ui/theme';
import { badgesLink } from '../../../ui/components/badge';
import { dioramaSection } from './dioramaList';
import { cubedHref } from '../../href';
import { freePlayHref, type Candidate, type SizeBand } from '../../../game/freePlay';
import { lazyThumbs } from '../../../ui/components/lazyThumb';

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

function card(puzzle: Puzzle, index: number, fill: ReturnType<typeof lazyThumbs>): HTMLElement {
  const stats = getPuzzleStats(puzzle.id);
  const saved = getSavedBoard(puzzle.id);
  const band = difficultyOf(puzzle);
  const thumb = fill(el('div', { className: 'thumb' }), () =>
    stats ? shapePicture(puzzle, 88) : blockOutline(puzzle.dims, 88),
  );
  const meta = stats
    ? `${dimsLabel(puzzle.dims)} · ${formatTime(stats.bestTime)}`
    : saved
      ? `${dimsLabel(puzzle.dims)} · in progress`
      : dimsLabel(puzzle.dims);
  return el(
    'a',
    { className: `puzzle-card${stats ? ' solved' : ''}`, href: cubedHref(`/play/${puzzle.id}`) },
    [
      thumb,
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
      el('a', { className: 'button primary', href: cubedHref('/tutorial'), textContent: 'Start' }),
    ]),
  ]);
}

/** Each puzzle's place in the pack, which an unsolved card shows as its number. */
const INDEX = new Map(PUZZLES.map((p, i) => [p.id, i]));
const solved = (p: Puzzle) => Boolean(getPuzzleStats(p.id));
/** Past the list's difficulty filter (Cubed's view of it shows Flat's insane as expert). */
const rated = (p: Puzzle) => {
  const d = getSettings().listDifficulty;
  return d === 'any' || difficultyOf(p).id === d;
};

/** Each section's puzzles, past the size filter (free play's: `size`, #153). */
function bySection(size: SizeBand) {
  return SECTIONS.flatMap((section, s) => {
    if (size !== 'any' && size !== section.id) return [];
    const min = s ? SECTIONS[s - 1].max : 0;
    return [{ section, all: PUZZLES.filter((p) => longest(p) > min && longest(p) <= section.max) }];
  });
}

/**
 * The list: its sections by size, then the dioramas, or a line saying nothing matches.
 * The home list shows every size; free play's Cubed tab passes its size filter.
 */
export function puzzleList(size: SizeBand = 'any'): HTMLElement[] {
  const filter = getSettings().listFilter;
  const fill = lazyThumbs();
  const sections = bySection(size).flatMap(({ section, all }) => {
    const shown = all.filter(
      (p) => rated(p) && (filter === 'all' || (filter === 'done') === solved(p)),
    );
    if (!shown.length) return [];
    return el('section', { className: 'list-section' }, [
      el('h2', {}, [
        section.title,
        el('span', {
          className: 'count',
          textContent: ` ${all.filter(solved).length}/${all.length}`,
        }),
      ]),
      el(
        'div',
        { className: 'puzzle-grid' },
        shown.map((p) => card(p, INDEX.get(p.id)!, fill)),
      ),
    ]);
  });
  if (!sections.length) {
    return [
      el('p', { className: 'empty-list', textContent: 'No puzzles match. Try another filter.' }),
    ];
  }
  // Dioramas aren't one size, so a size filter leaves them out.
  const dioramas = size === 'any' ? dioramaSection() : null;
  return dioramas ? [...sections, dioramas] : sections;
}

/** The unsolved puzzles past the difficulty and size filters, in the list's order (#153). */
export function unsolvedPuzzles(size: SizeBand): Candidate[] {
  return bySection(size).flatMap(({ all }) =>
    all
      .filter((p) => rated(p) && !solved(p))
      .map((p) => ({
        href: cubedHref(`/play/${p.id}`),
        band: BANDS.findIndex((b) => b.id === difficultyOf(p).id),
      })),
  );
}

/** The puzzle list, settings and stats (#/cubed). */
export function renderSelectScreen(root: HTMLElement): void {
  const rerender = () => renderSelectScreen(root);
  const stats = getOverallStats();

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
      gameSwitch('cubed'),
      el('header', { className: 'topbar' }, [
        el('h1', { textContent: 'Picross Cubed' }),
        badgesLink(),
        // Both boards' puzzles in one place, with size filters (#153).
        el('a', {
          className: 'button ghost',
          href: freePlayHref('cubed'),
          textContent: 'Free play',
        }),
        el('a', { className: 'button ghost', href: cubedHref('/editor'), textContent: 'Editor' }),
        el('a', {
          className: 'button ghost',
          href: cubedHref('/how-to-play'),
          textContent: 'How to play',
        }),
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
      ...puzzleList(),
    ]),
  );
}
