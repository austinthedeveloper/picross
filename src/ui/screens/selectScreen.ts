import { getOverallStats, getPuzzleStats, getSavedBoard } from '../../game/progress';
import { getSettings, updateSettings, type Mode } from '../../game/settings';
import { puzzles } from '../../puzzles/index';
import type { Puzzle } from '../../puzzles/format';
import { createPicture } from '../board/picture';
import { createMuteButton } from '../components/muteButton';
import { el } from '../dom';
import { formatTime } from '../format';
import { applyTheme } from '../theme';
import { runBanner } from './runScreen';

const MODE_HINTS: Record<Mode, string> = {
  relaxed: 'No checking. Solve at your own pace.',
  hearts: 'Wrong fills cost a heart. Three and you start over.',
};

/** One puzzle card. The picture and name stay hidden until it's solved. */
function puzzleCard(p: Puzzle, number: number): HTMLElement {
  const stats = getPuzzleStats(p.id);
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
      el('span', { textContent: `${p.width}×${p.height}` }),
      el('span', { className: 'status', textContent: status }),
    ]),
  ]);
}

/** The puzzle list grouped by size, biggest first. Cards keep their pack-wide number. */
function sizeSections(): HTMLElement[] {
  const sizes = [...new Set(puzzles.map((p) => p.width))].sort((a, b) => b - a);
  return sizes.map((size) => {
    const group = puzzles.filter((p) => p.width === size);
    const solved = group.filter((p) => getPuzzleStats(p.id)).length;
    return el('section', { className: 'size-section', ariaLabel: `${size}×${size} puzzles` }, [
      el('h2', { className: 'size-heading' }, [
        `${size}×${size}`,
        el('span', { className: 'size-count', textContent: `${solved}/${group.length}` }),
      ]),
      el(
        'div',
        { className: 'cards' },
        group.map((p) => puzzleCard(p, puzzles.indexOf(p) + 1)),
      ),
    ]);
  });
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
      runBanner(),
      el('div', { className: 'mode-row' }, [
        el('div', { className: 'segmented', role: 'group', ariaLabel: 'Mode' }, [
          modeButton('relaxed', 'Relaxed', 'No checking'),
          modeButton('hearts', '♥ Hearts', 'Wrong fills cost a heart'),
        ]),
        el('span', { className: 'mode-hint', textContent: MODE_HINTS[settings.mode] }),
      ]),
      el('section', { className: 'stats', ariaLabel: 'Stats' }, [
        stat(`${overall.solved}/${puzzles.length}`, 'Puzzles solved'),
        stat(String(overall.solves), 'Total solves'),
        stat(formatTime(overall.totalTime), 'Time solving'),
      ]),
      ...sizeSections(),
      el('footer', { className: 'footer' }, [
        el('a', { href: '#/editor', textContent: 'Make your own puzzle →' }),
      ]),
    ]),
  );
}
