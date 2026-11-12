/** Cubed's puzzle list (#153): its sections by size, then the dioramas. Free play's Cubed tab shows it. */
import { dimsLabel } from '@picross/block/engine/volume';
import { getOverallStats, getPuzzleStats, getSavedBoard } from '../../game/progress';
import { getSettings, updateSettings } from '../../game/settings';
import { BANDS, difficultyOf } from '@picross/block/puzzles/difficulty';
import type { Puzzle } from '@picross/block/puzzles/format';
import { PUZZLES } from '@picross/block/puzzles/index';
import { blockOutline, shapePicture } from '@picross/play-block/ui/board/thumbnail';
import { el } from '@picross/shared/ui/dom';
import { formatTime } from '@picross/shared/ui/format';
import { puzzleNumber } from '@picross/play-block/ui/format';
import { dioramaSection } from './dioramaList';
import { cubedHref } from '../../href';
import type { Candidate, SizeBand } from '../../../game/freePlay';
import { lazyThumbs } from '../../../ui/components/lazyThumb';

/** The list's sections, by the longest side of the block. */
const SECTIONS = [
  { id: 'small', title: 'Small', max: 4 },
  { id: 'medium', title: 'Medium', max: 6 },
  { id: 'large', title: 'Large', max: 8 },
  { id: 'huge', title: 'Huge', max: Infinity },
];

const longest = (p: Puzzle) => Math.max(p.dims.x, p.dims.y, p.dims.z);

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

/** Cubed's stats over its list: solved, and time played (from its old home, #152). */
export function cubedStats(): HTMLElement {
  const stats = getOverallStats();
  return el('p', {
    className: 'stats',
    textContent: `${stats.solved}/${PUZZLES.length} solved · ${formatTime(stats.totalTime)} played`,
  });
}

/**
 * The tutorial offer, until it's been done (or the player has solved something): on free
 * play's Cubed tab, where a new player meets their first block (#152).
 */
export function tutorialCard(): HTMLElement | null {
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
