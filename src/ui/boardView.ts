import { Cell, column, row, type Board } from '../engine/board';
import { satisfiedClues } from '../engine/clues';
import type { Puzzle } from '../puzzles/format';
import { el } from './dom';

export interface BoardView {
  root: HTMLElement;
  cells: HTMLElement[];
  update(board: Board): void;
  highlight(r: number | null, c: number | null): void;
  flashError(index: number): void;
}

const CELL_CLASS: Record<Cell, string> = {
  [Cell.Empty]: '',
  [Cell.Filled]: 'filled',
  [Cell.Marked]: 'marked',
};

function clueGroup(
  clues: number[],
  className: string,
): { group: HTMLElement; nums: HTMLElement[] } {
  const nums = (clues.length ? clues : [0]).map((n) => el('span', { textContent: String(n) }));
  return { group: el('div', { className }, nums), nums };
}

/** Renders the grid with row/column clues as a CSS grid. */
export function createBoardView(puzzle: Puzzle): BoardView {
  const { width: w, height: h, clues } = puzzle;
  const root = el('div', { className: 'board' });
  root.style.setProperty('--w', String(w));
  root.style.setProperty('--h', String(h));
  root.style.setProperty('--rc', String(Math.max(1, ...clues.rows.map((c) => c.length))));
  root.style.setProperty('--cc', String(Math.max(1, ...clues.cols.map((c) => c.length))));

  root.append(el('div', { className: 'corner' }));
  const colClues = clues.cols.map((cl, c) => {
    const g = clueGroup(cl, 'clue col-clue');
    if (c % 5 === 4 && c < w - 1) g.group.classList.add('guide-x');
    root.append(g.group);
    return g;
  });

  const rowClues: ReturnType<typeof clueGroup>[] = [];
  const cells: HTMLElement[] = [];
  for (let r = 0; r < h; r++) {
    const g = clueGroup(clues.rows[r], 'clue row-clue');
    if (r % 5 === 4 && r < h - 1) g.group.classList.add('guide-y');
    root.append(g.group);
    rowClues.push(g);
    for (let c = 0; c < w; c++) {
      const cell = el('div', { className: 'cell' });
      cell.dataset.i = String(r * w + c);
      if (c % 5 === 4 && c < w - 1) cell.classList.add('guide-x');
      if (r % 5 === 4 && r < h - 1) cell.classList.add('guide-y');
      if (r === 0) cell.classList.add('edge-top');
      if (c === 0) cell.classList.add('edge-left');
      if (r === h - 1) cell.classList.add('edge-bottom');
      if (c === w - 1) cell.classList.add('edge-right');
      cells.push(cell);
      root.append(cell);
    }
  }

  const dim = (nums: HTMLElement[], clueList: number[], line: Cell[]) => {
    if (clueList.length === 0) {
      nums[0].classList.toggle('done', !line.includes(Cell.Filled));
      return;
    }
    satisfiedClues(line, clueList).forEach((done, i) => nums[i].classList.toggle('done', done));
  };

  return {
    root,
    cells,
    update(board) {
      board.cells.forEach((state, i) => {
        cells[i].className = cells[i].className.replace(/\b(filled|marked)\b/g, '').trim();
        if (CELL_CLASS[state]) cells[i].classList.add(CELL_CLASS[state]);
      });
      for (let r = 0; r < h; r++) dim(rowClues[r].nums, clues.rows[r], row(board, r));
      for (let c = 0; c < w; c++) dim(colClues[c].nums, clues.cols[c], column(board, c));
    },
    flashError(index) {
      const cell = cells[index];
      cell.classList.remove('error');
      void cell.offsetWidth; // restart the animation
      cell.classList.add('error');
    },
    highlight(r, c) {
      rowClues.forEach((g, i) => g.group.classList.toggle('hl', i === r));
      colClues.forEach((g, i) => g.group.classList.toggle('hl', i === c));
    },
  };
}
