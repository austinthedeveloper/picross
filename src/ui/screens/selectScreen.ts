import { dimsLabel } from '../../engine/volume';
import { getOverallStats, getPuzzleStats, getSavedBoard } from '../../game/progress';
import { getSettings, updateSettings, type Mode } from '../../game/settings';
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
  { id: 'large', title: 'Large', max: Infinity },
];

const longest = (p: Puzzle) => Math.max(p.dims.x, p.dims.y, p.dims.z);

function card(puzzle: Puzzle, index: number): HTMLElement {
  const stats = getPuzzleStats(puzzle.id);
  const saved = getSavedBoard(puzzle.id);
  const picture = stats ? shapePicture(puzzle, 88) : blockOutline(puzzle.dims, 88);
  return el(
    'a',
    { className: `puzzle-card${stats ? ' solved' : ''}`, href: `#/play/${puzzle.id}` },
    [
      el('div', { className: 'thumb' }, [picture]),
      el('span', {
        className: 'card-name',
        textContent: stats ? puzzle.name : puzzleNumber(index),
      }),
      el('span', {
        className: 'card-meta',
        textContent: stats
          ? `${dimsLabel(puzzle.dims)} · ${formatTime(stats.bestTime)}`
          : saved
            ? `${dimsLabel(puzzle.dims)} · in progress`
            : dimsLabel(puzzle.dims),
      }),
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

/** The puzzle list, settings and stats (#/). */
export function renderSelectScreen(root: HTMLElement): void {
  const settings = getSettings();
  const modes: { id: Mode; label: string; title: string }[] = [
    { id: 'relaxed', label: 'Relaxed', title: 'Nothing is checked as you go' },
    { id: 'hearts', label: 'Hearts', title: 'Breaking a cube of the shape costs a heart' },
  ];
  const modeButtons = modes.map((m) =>
    el('button', {
      className: 'toggle',
      textContent: m.label,
      title: m.title,
      onclick: () => {
        updateSettings({ mode: m.id });
        modeButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(modes[i].id === m.id)));
      },
    }),
  );
  modeButtons.forEach((b, i) =>
    b.setAttribute('aria-pressed', String(modes[i].id === settings.mode)),
  );

  const stats = getOverallStats();
  const sections = SECTIONS.map((section, s) => {
    const min = s ? SECTIONS[s - 1].max : 0;
    const puzzles = PUZZLES.filter((p) => longest(p) > min && longest(p) <= section.max);
    if (!puzzles.length) return null;
    const solved = puzzles.filter((p) => getPuzzleStats(p.id)).length;
    return el('section', { className: 'list-section' }, [
      el('h2', {}, [
        section.title,
        el('span', { className: 'count', textContent: ` ${solved}/${puzzles.length}` }),
      ]),
      el(
        'div',
        { className: 'puzzle-grid' },
        puzzles.map((p) => card(p, PUZZLES.indexOf(p))),
      ),
    ]);
  });

  root.replaceChildren(
    el('div', { className: 'screen select' }, [
      el('header', { className: 'topbar' }, [
        el('h1', { textContent: 'Picross Cubed' }),
        el('a', { className: 'button ghost', href: '#/how-to-play', textContent: 'How to play' }),
      ]),
      el('p', {
        className: 'lede',
        textContent: 'Each block hides a shape. Break away every cube that isn’t part of it.',
      }),
      el('div', { className: 'settings' }, [
        el('div', { className: 'segmented', role: 'group', ariaLabel: 'Mode' }, modeButtons),
        createMuteButton(),
        toggle(
          'High contrast',
          () => getSettings().highContrast,
          (v) => {
            updateSettings({ highContrast: v });
            applyTheme();
            renderSelectScreen(root);
          },
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
      ...sections.filter((s): s is HTMLElement => s !== null),
    ]),
  );
}
