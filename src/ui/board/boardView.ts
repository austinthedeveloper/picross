import { Cell, column, row, type Board } from '../../engine/board';
import { satisfiedClues } from '../../engine/clues';
import { isFogged, noFog, type Fog } from '../../engine/fog';
import type { Puzzle } from '../../puzzles/format';
import { el } from '../dom';

export interface Line {
  kind: 'row' | 'col';
  index: number;
}

export interface BoardView {
  root: HTMLElement;
  cells: HTMLElement[];
  /** Redraws the board. Returns lines whose clues just became fully satisfied. */
  update(board: Board): Line[];
  highlight(r: number | null, c: number | null): void;
  setCursor(r: number, c: number): void;
  flashError(index: number): void;
  flashHint(indexes: number[]): void;
  flashLine(line: Line): void;
  /** Flashes two rows the Mimic just swapped. */
  flashSwap(a: number, b: number): void;
  /** Hides fogged clues behind "?" (#30). Lines in `lifted` animate as the fog clears. */
  setFog(fog: Fog, lifted?: Line[]): void;
  /**
   * Shows scrambled clues in ascending order with a ⚙ (#49), so you know the runs but
   * not their order. Lines in `restored` animate back into order.
   */
  setScramble(scramble: Fog, restored?: Line[]): void;
}

const STATE: Record<Cell, { className: string; label: string }> = {
  [Cell.Empty]: { className: '', label: 'empty' },
  [Cell.Filled]: { className: 'filled', label: 'filled' },
  [Cell.Marked]: { className: 'marked', label: 'marked' },
};

interface ClueGroup {
  group: HTMLElement;
  nums: HTMLElement[];
  label: string;
  complete: boolean;
}

function clueGroup(clues: number[], className: string, role: string, label: string): ClueGroup {
  const nums = (clues.length ? clues : [0]).map((n) =>
    el('span', { textContent: String(n), ariaHidden: 'true' }),
  );
  const fullLabel = `${label} clues: ${clues.length ? clues.join(', ') : 'none'}`;
  const group = el('div', { className, role, ariaLabel: fullLabel }, nums);
  return { group, nums, label: fullLabel, complete: false };
}

/** Plays a one-shot animation class, removing it afterwards so it can replay. */
function restartAnimation(node: HTMLElement, className: string, ms = 900) {
  node.classList.remove(className);
  void node.offsetWidth; // force a reflow so the animation plays again
  node.classList.add(className);
  window.setTimeout(() => node.classList.remove(className), ms);
}

let boardCount = 0;

/**
 * Renders the grid with row/column clues as a CSS grid, exposed to assistive
 * tech as an ARIA grid: a header row of column clues, then one row per board
 * row with its clues as the row header.
 */
export function createBoardView(puzzle: Puzzle): BoardView {
  const { width: w, height: h, clues } = puzzle;
  const idPrefix = `board${++boardCount}`;
  const root = el('div', {
    className: 'board',
    role: 'grid',
    tabIndex: 0,
    ariaLabel: `Puzzle board, ${w} columns by ${h} rows`,
  });
  root.style.setProperty('--w', String(w));
  root.style.setProperty('--h', String(h));
  root.style.setProperty('--rc', String(Math.max(1, ...clues.rows.map((c) => c.length))));
  root.style.setProperty('--cc', String(Math.max(1, ...clues.cols.map((c) => c.length))));

  const header = el('div', { className: 'board-row', role: 'row' }, [
    el('div', { className: 'corner', role: 'presentation' }),
  ]);
  root.append(header);
  const colClues = clues.cols.map((cl, c) => {
    const g = clueGroup(cl, 'clue col-clue', 'columnheader', `Column ${c + 1}`);
    if (c % 5 === 4 && c < w - 1) g.group.classList.add('guide-x');
    header.append(g.group);
    return g;
  });

  const rowClues: ClueGroup[] = [];
  const cells: HTMLElement[] = [];
  for (let r = 0; r < h; r++) {
    const rowEl = el('div', { className: 'board-row', role: 'row' });
    const g = clueGroup(clues.rows[r], 'clue row-clue', 'rowheader', `Row ${r + 1}`);
    if (r % 5 === 4 && r < h - 1) g.group.classList.add('guide-y');
    rowEl.append(g.group);
    rowClues.push(g);
    for (let c = 0; c < w; c++) {
      const cell = el('div', { className: 'cell', role: 'gridcell', id: `${idPrefix}-${r}-${c}` });
      cell.dataset.i = String(r * w + c);
      // Stagger for the diagonal reveal wave when the puzzle is solved.
      cell.style.setProperty('--d', `${(r + c) * 30}ms`);
      if (c % 5 === 4 && c < w - 1) cell.classList.add('guide-x');
      if (r % 5 === 4 && r < h - 1) cell.classList.add('guide-y');
      if (r === 0) cell.classList.add('edge-top');
      if (c === 0) cell.classList.add('edge-left');
      if (r === h - 1) cell.classList.add('edge-bottom');
      if (c === w - 1) cell.classList.add('edge-right');
      cells.push(cell);
      rowEl.append(cell);
    }
    root.append(rowEl);
  }

  let fog: Fog = noFog();
  let scramble: Fog = noFog();
  const fogLabel = (g: ClueGroup) => g.label.replace(/clues: .*/, 'clues hidden by fog');
  const scrambleLabel = (g: ClueGroup, runs: number[]) =>
    g.label.replace(
      /clues: .*/,
      `clues in unknown order: ${[...runs].sort((a, b) => a - b).join(', ')}`,
    );

  /**
   * Dims satisfied clue numbers; returns whether the whole line is satisfied.
   * Scrambled clues only dim as a whole: dimming one number would give away its place.
   */
  const dim = (
    g: ClueGroup,
    clueList: number[],
    line: Cell[],
    fogged: boolean,
    scrambled: boolean,
  ): boolean => {
    const done =
      clueList.length === 0 ? [!line.includes(Cell.Filled)] : satisfiedClues(line, clueList);
    const complete = done.every(Boolean);
    done.forEach((d, i) => g.nums[i].classList.toggle('done', scrambled ? complete : d));
    g.group.ariaLabel = fogged
      ? fogLabel(g)
      : scrambled
        ? scrambleLabel(g, clueList)
        : complete
          ? `${g.label}, complete`
          : g.label;
    return complete;
  };

  /** Shows a clue group's numbers sorted (scrambled) or in their real order. */
  const showOrder = (g: ClueGroup, runs: number[], scrambled: boolean) => {
    if (!runs.length) return;
    const shown = scrambled ? [...runs].sort((a, b) => a - b) : runs;
    shown.forEach((n, i) => (g.nums[i].textContent = String(n)));
    g.group.classList.toggle('scrambled', scrambled);
  };

  let cursor: HTMLElement | null = null;
  let first = true;

  return {
    root,
    cells,
    update(board) {
      board.cells.forEach((state, i) => {
        const cell = cells[i];
        cell.classList.remove('filled', 'marked');
        if (STATE[state].className) cell.classList.add(STATE[state].className);
        const r = Math.floor(i / w);
        cell.ariaLabel = `Row ${r + 1}, column ${(i % w) + 1}, ${STATE[state].label}`;
      });
      const completed: Line[] = [];
      const check = (g: ClueGroup, line: Line, complete: boolean) => {
        if (complete && !g.complete && !first) completed.push(line);
        g.complete = complete;
      };
      for (let r = 0; r < h; r++) {
        check(
          rowClues[r],
          { kind: 'row', index: r },
          dim(
            rowClues[r],
            clues.rows[r],
            row(board, r),
            isFogged(fog, 'row', r),
            isFogged(scramble, 'row', r),
          ),
        );
      }
      for (let c = 0; c < w; c++) {
        check(
          colClues[c],
          { kind: 'col', index: c },
          dim(
            colClues[c],
            clues.cols[c],
            column(board, c),
            isFogged(fog, 'col', c),
            isFogged(scramble, 'col', c),
          ),
        );
      }
      first = false;
      return completed;
    },
    setCursor(r, c) {
      cursor?.classList.remove('cursor');
      cursor = cells[r * w + c];
      cursor.classList.add('cursor');
      root.setAttribute('aria-activedescendant', cursor.id);
    },
    flashError(index) {
      restartAnimation(cells[index], 'error');
    },
    flashLine({ kind, index }) {
      const group = kind === 'row' ? rowClues[index] : colClues[index];
      restartAnimation(group.group, 'line-flash');
      const span = kind === 'row' ? w : h;
      for (let k = 0; k < span; k++) {
        const i = kind === 'row' ? index * w + k : k * w + index;
        restartAnimation(cells[i], 'line-flash');
      }
    },
    setScramble(next, restored = []) {
      scramble = next;
      rowClues.forEach((g, r) => {
        showOrder(g, clues.rows[r], isFogged(scramble, 'row', r));
        if (isFogged(scramble, 'row', r)) g.group.ariaLabel = scrambleLabel(g, clues.rows[r]);
      });
      colClues.forEach((g, c) => {
        showOrder(g, clues.cols[c], isFogged(scramble, 'col', c));
        if (isFogged(scramble, 'col', c)) g.group.ariaLabel = scrambleLabel(g, clues.cols[c]);
      });
      for (const { kind, index } of restored) {
        restartAnimation((kind === 'row' ? rowClues : colClues)[index].group, 'unscramble');
      }
    },
    setFog(next, lifted = []) {
      fog = next;
      const apply = (g: ClueGroup, fogged: boolean) => {
        g.group.classList.toggle('fogged', fogged);
        if (fogged) g.group.ariaLabel = fogLabel(g);
      };
      rowClues.forEach((g, r) => apply(g, isFogged(fog, 'row', r)));
      colClues.forEach((g, c) => apply(g, isFogged(fog, 'col', c)));
      for (const { kind, index } of lifted) {
        restartAnimation((kind === 'row' ? rowClues : colClues)[index].group, 'unfog');
      }
    },
    flashSwap(a, b) {
      for (const r of [a, b]) {
        restartAnimation(rowClues[r].group, 'swapped');
        for (let c = 0; c < w; c++) restartAnimation(cells[r * w + c], 'swapped');
      }
    },
    flashHint(indexes) {
      for (const i of indexes) restartAnimation(cells[i], 'hinted');
    },
    highlight(r, c) {
      rowClues.forEach((g, i) => g.group.classList.toggle('hl', i === r));
      colClues.forEach((g, i) => g.group.classList.toggle('hl', i === c));
    },
  };
}
