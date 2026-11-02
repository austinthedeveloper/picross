import { getOverallStats, getPuzzleStats, getSavedBoard, isPuzzleSolved } from '../game/progress';
import { puzzles } from '../puzzles/index';
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
  app.replaceChildren(
    el('main', { className: 'screen select' }, [
      el('header', { className: 'topbar' }, [el('h1', { textContent: 'Picross' })]),
      el('section', { className: 'stats', ariaLabel: 'Stats' }, [
        stat(`${solvedCount}/${puzzles.length}`, 'Puzzles solved'),
        stat(String(overall.solves), 'Total solves'),
        stat(formatTime(overall.totalTime), 'Time solving'),
      ]),
      el('div', { className: 'cards' }, cards),
    ]),
  );
}
