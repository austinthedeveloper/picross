import { getOverallStats, getPuzzleStats, getSavedBoard, isPuzzleSolved } from '../game/progress';
import { puzzles } from '../puzzles/index';
import { getSettings, updateSettings, type Mode } from '../game/settings';
import { el } from './dom';
import { formatTime } from './format';
import { createPicture } from './picture';

export function renderSelectScreen(app: HTMLElement): void {
  const cards = puzzles.map((p, i) => {
    const solved = isPuzzleSolved(p.id);
    const best = getPuzzleStats(p.id)?.bestTime;
    const status =
      best !== undefined
        ? `✓ ${formatTime(best)}`
        : getSavedBoard(p.id)
          ? 'In progress'
          : 'Unsolved';
    const thumb = solved
      ? createPicture(p.solution, Math.floor(60 / Math.max(p.width, p.height)))
      : el('span', { className: 'unknown', textContent: '?' });
    return el('a', { className: `card${solved ? ' solved' : ''}`, href: `#/play/${p.id}` }, [
      el('div', { className: 'thumb' }, [thumb]),
      el('div', { className: 'card-name', textContent: solved ? p.name : `No. ${i + 1}` }),
      el('div', { className: 'card-meta' }, [
        el('span', { textContent: `${p.width}×${p.height}` }),
        el('span', { className: 'status', textContent: status }),
      ]),
    ]);
  });

  const solvedCount = puzzles.filter((p) => isPuzzleSolved(p.id)).length;
  const overall = getOverallStats();
  const stat = (value: string, label: string) =>
    el('div', { className: 'stat' }, [
      el('strong', { textContent: value }),
      el('span', { textContent: label }),
    ]);
  const modeButton = (mode: Mode, label: string, hint: string) => {
    const button = el('button', { className: 'tool', textContent: label, title: hint });
    button.setAttribute('aria-pressed', String(getSettings().mode === mode));
    button.onclick = () => {
      updateSettings({ mode });
      renderSelectScreen(app);
    };
    return button;
  };
  const modeHint =
    getSettings().mode === 'hearts'
      ? 'Wrong fills cost a heart. Three and you start over.'
      : 'No checking. Solve at your own pace.';

  app.replaceChildren(
    el('main', { className: 'screen select' }, [
      el('header', { className: 'topbar' }, [el('h1', { textContent: 'Picross' })]),
      el('div', { className: 'mode-row' }, [
        el('div', { className: 'segmented', role: 'group', ariaLabel: 'Mode' }, [
          modeButton('relaxed', 'Relaxed', 'No checking'),
          modeButton('hearts', '♥ Hearts', 'Wrong fills cost a heart'),
        ]),
        el('span', { className: 'mode-hint', textContent: modeHint }),
      ]),
      el('section', { className: 'stats', ariaLabel: 'Stats' }, [
        stat(`${solvedCount}/${puzzles.length}`, 'Puzzles solved'),
        stat(String(overall.solves), 'Total solves'),
        stat(formatTime(overall.totalTime), 'Time solving'),
      ]),
      el('div', { className: 'cards' }, cards),
    ]),
  );
}
