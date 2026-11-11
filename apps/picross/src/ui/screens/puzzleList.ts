/**
 * The 2D pack as a list: murals, then the puzzles by size. The home list (`selectScreen.ts`)
 * and free play's Flat tab (`freePlay.ts`, #153) both show it.
 */
import { getPuzzleStats, getSavedBoard } from '../../game/progress';
import { flatSizeBand, type Candidate, type SizeBand } from '../../game/freePlay';
import {
  inListOrder,
  inPuzzleOrder,
  passesFilter,
  type DifficultyFilter,
  type ListFilter,
  type ListOrder,
} from '../../game/settings';
import { DIFFICULTIES, puzzleDifficulty, puzzlePasses } from '@picross/grid/puzzles/difficulty';
import { puzzles } from '@picross/grid/puzzles/index';
import type { Puzzle } from '@picross/grid/puzzles/format';
import { createPicture } from '@picross/play-grid/ui/board/picture';
import { formatTime } from '@picross/play-grid/ui/format';
import { el } from '@picross/shared/ui/dom';
import { listSection } from '../components/listSection';
import { lazyThumbs } from '../components/lazyThumb';
import { muralSection } from './mural';

/** What the list shows, from the settings. The home list leaves `size` at 'any'. */
export interface ListView {
  filter: ListFilter;
  order: ListOrder;
  difficulty: DifficultyFilter;
  size: SizeBand;
}

const EMPTY_LIST: Record<ListFilter, string> = {
  all: '',
  todo: 'You’ve completed everything. Well done.',
  done: 'Nothing completed yet. Pick a puzzle and get going.',
};

/** Each puzzle's pack-wide number, which its card keeps whatever the order. */
const NUMBER = new Map(puzzles.map((p, i) => [p.id, i + 1]));
const SIZES = [...new Set(puzzles.map((p) => p.width))].sort((a, b) => a - b);
const isSolved = (id: string) => Boolean(getPuzzleStats(id));

/** One puzzle card. The picture and name stay hidden until it's solved. */
function puzzleCard(p: Puzzle, fill: ReturnType<typeof lazyThumbs>): HTMLElement {
  const stats = getPuzzleStats(p.id);
  const difficulty = puzzleDifficulty(p.id);
  const status = stats
    ? `✓ ${formatTime(stats.bestTime)}`
    : getSavedBoard(p.id)
      ? 'In progress'
      : 'Unsolved';
  const thumb = el('div', { className: 'thumb' });
  if (stats) {
    fill(thumb, () => createPicture(p.solution, Math.floor(60 / Math.max(p.width, p.height))));
  } else thumb.append(el('span', { className: 'thumb-unknown', textContent: '?' }));
  return el('a', { className: `card${stats ? ' solved' : ''}`, href: `#/play/${p.id}` }, [
    thumb,
    el('div', { className: 'card-name', textContent: stats ? p.name : `No. ${NUMBER.get(p.id)}` }),
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

/** Each size's puzzles in the list's order, past the difficulty and size filters. */
function bySize({ order, difficulty, size }: ListView): [number, Puzzle[], Puzzle[]][] {
  return inListOrder(order, SIZES).flatMap((width): [number, Puzzle[], Puzzle[]][] => {
    if (size !== 'any' && flatSizeBand(width) !== size) return [];
    const group = puzzles.filter((p) => p.width === width);
    const rated = group.filter(
      (p) => difficulty === 'any' || puzzleDifficulty(p.id).id === difficulty,
    );
    return [[width, group, inPuzzleOrder(order, rated, (p) => puzzlePasses(p.id))]];
  });
}

/**
 * The puzzle list grouped by size. Cards keep their pack-wide number whatever
 * the order, and the headings count the whole size whatever the filter hides.
 */
function sizeSections(view: ListView): HTMLElement[] {
  const fill = lazyThumbs();
  return bySize(view).flatMap(([size, group, rated]) => {
    const shown = rated.filter((p) => passesFilter(view.filter, isSolved(p.id)));
    if (!shown.length) return [];
    return listSection({
      id: `size-${size}`,
      label: `${size}×${size} puzzles`,
      heading: `${size}×${size}`,
      count: `${group.filter((p) => isSolved(p.id)).length}/${group.length}`,
      content: el(
        'div',
        { className: 'cards' },
        shown.map((p) => puzzleCard(p, fill)),
      ),
    });
  });
}

/** The list: murals, then the sizes, or a line saying why there's nothing to show. */
export function puzzleList(view: ListView): HTMLElement[] {
  // Murals aren't rated or sized like the pack, so either filter leaves them out.
  const murals =
    view.difficulty === 'any' && view.size === 'any' ? muralSection(view.filter, view.order) : null;
  const list = [murals, ...sizeSections(view)].flatMap((s) => s ?? []);
  if (list.length) return list;
  const filtered = view.difficulty !== 'any' || view.size !== 'any';
  return [
    el('p', {
      className: 'empty-list',
      textContent: filtered ? 'No puzzles match those filters.' : EMPTY_LIST[view.filter],
    }),
  ];
}

/**
 * The unsolved puzzles past the difficulty and size filters, in the list's order: Next
 * unsolved opens the first, Surprise me any (#114, #153).
 */
export function unsolvedPuzzles(view: ListView): Candidate[] {
  return bySize(view).flatMap(([, , rated]) =>
    rated
      .filter((p) => !isSolved(p.id))
      .map((p) => ({
        href: `#/play/${p.id}`,
        band: DIFFICULTIES.findIndex((d) => d.id === puzzleDifficulty(p.id).id),
      })),
  );
}
