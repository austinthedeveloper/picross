import { Cell, column, row, type Board } from '../../engine/board';
import { satisfiedClues } from '../../engine/clues';
import {
  hasLine,
  lineKey,
  noLines,
  type Line,
  type LineKind,
  type LineSet,
} from '../../engine/lines';
import type { Puzzle } from '../../puzzles/format';
import { el } from '../dom';
import { playOnce } from '../motion';

export type { Line };

export interface BoardView {
  root: HTMLElement;
  cells: HTMLElement[];
  /** Redraws the board. Returns lines whose clues just became fully satisfied. */
  update(board: Board): Line[];
  highlight(r: number | null, c: number | null): void;
  /** Keeps these lines highlighted, clues and cells, until the next call (How to play). */
  setFocus(lines: readonly Line[]): void;
  setCursor(r: number, c: number): void;
  flashError(index: number): void;
  flashHint(indexes: number[]): void;
  flashLine(line: Line): void;
  /** Highlights the clues of lines the Mimic wiped until they're refilled (#78). */
  setWiped(wiped: LineSet): void;
  /** Flashes two lines the Mimic just swapped and wiped. */
  flashSwap(kind: LineKind, a: number, b: number): void;
  /** Hides fogged clues behind "?" (#30). Lines in `lifted` animate as the fog clears. */
  setFog(fog: LineSet, lifted?: Line[]): void;
  /**
   * Shows scrambled clues in ascending order with a ⚙ (#49), so you know the runs but
   * not their order. Lines in `restored` animate back into order.
   */
  setScramble(scramble: LineSet, restored?: Line[]): void;
  /** Marks weak-point clues with 🎯 (#50). Lines in `cracked` flash as they crack. */
  setWeakPoints(weak: LineSet, cracked?: Line[]): void;
  /**
   * Shows forged clues (#64), keyed by line ("r3"), in place of the real ones. A faked
   * line only counts as complete when its fake is satisfied. Lines in `unmasked`
   * animate as their real clue comes back.
   */
  setFakes(fakes: ReadonlyMap<string, number[]>, unmasked?: Line[]): void;
  /** Marks the clues that might be forged with 🎭 (#64). */
  setSuspects(suspects: LineSet): void;
  /** While set, tapping a clue (or Enter on it) picks its line instead of doing nothing. */
  pickClue(onPick: ((line: Line) => void) | null): void;
  /**
   * Covers cells in ink (#67): your marks under it are hidden, though you can
   * still play there. Cells in `washed` animate as the ink comes off.
   */
  setInk(cells: readonly number[], washed?: readonly number[]): void;
}

const STATE: Record<Cell, { className: string; label: string }> = {
  [Cell.Empty]: { className: '', label: 'empty' },
  [Cell.Filled]: { className: 'filled', label: 'filled' },
  [Cell.Marked]: { className: 'marked', label: 'marked' },
};

interface ClueGroup {
  group: HTMLElement;
  nums: HTMLElement[];
  /** "Row 3": the start of every label. */
  name: string;
  label: string;
  complete: boolean;
}

/** Fills a clue group with its numbers (one 0 for an empty line). */
function setNumbers(g: ClueGroup, clues: number[]) {
  g.nums = (clues.length ? clues : [0]).map((n) =>
    el('span', { textContent: String(n), ariaHidden: 'true' }),
  );
  g.group.replaceChildren(...g.nums);
  g.label = `${g.name} clues: ${clues.length ? clues.join(', ') : 'none'}`;
  g.group.ariaLabel = g.label;
}

function clueGroup(clues: number[], className: string, role: string, name: string): ClueGroup {
  const g: ClueGroup = {
    group: el('div', { className, role }),
    nums: [],
    name,
    label: '',
    complete: false,
  };
  setNumbers(g, clues);
  return g;
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

  let fog: LineSet = noLines();
  let scramble: LineSet = noLines();
  let fakes: ReadonlyMap<string, number[]> = new Map();
  /** The clue a line shows: its forgery if it has one (#64), else the real one. */
  const shown = (kind: LineKind, i: number) =>
    fakes.get(lineKey(kind, i)) ?? (kind === 'row' ? clues.rows : clues.cols)[i];

  let inked = new Set<number>();

  let picker: ((line: Line) => void) | null = null;
  const pickable = (g: ClueGroup, line: Line) => {
    g.group.addEventListener('click', () => picker?.(line));
    g.group.addEventListener('keydown', (e) => {
      if (!picker || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      e.stopPropagation();
      picker(line);
    });
  };
  rowClues.forEach((g, index) => pickable(g, { kind: 'row', index }));
  colClues.forEach((g, index) => pickable(g, { kind: 'col', index }));
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
        const shows = inked.has(i) ? 'covered in ink' : STATE[state].label;
        cell.ariaLabel = `Row ${r + 1}, column ${(i % w) + 1}, ${shows}`;
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
            shown('row', r),
            row(board, r),
            hasLine(fog, 'row', r),
            hasLine(scramble, 'row', r),
          ),
        );
      }
      for (let c = 0; c < w; c++) {
        check(
          colClues[c],
          { kind: 'col', index: c },
          dim(
            colClues[c],
            shown('col', c),
            column(board, c),
            hasLine(fog, 'col', c),
            hasLine(scramble, 'col', c),
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
      playOnce(cells[index], 'error');
    },
    flashLine({ kind, index }) {
      const group = kind === 'row' ? rowClues[index] : colClues[index];
      playOnce(group.group, 'line-flash');
      const span = kind === 'row' ? w : h;
      for (let k = 0; k < span; k++) {
        const i = kind === 'row' ? index * w + k : k * w + index;
        playOnce(cells[i], 'line-flash');
      }
    },
    setWeakPoints(weak, cracked = []) {
      rowClues.forEach((g, r) => g.group.classList.toggle('weak-point', hasLine(weak, 'row', r)));
      colClues.forEach((g, c) => g.group.classList.toggle('weak-point', hasLine(weak, 'col', c)));
      for (const { kind, index } of cracked) {
        playOnce((kind === 'row' ? rowClues : colClues)[index].group, 'cracked');
      }
    },
    setScramble(next, restored = []) {
      scramble = next;
      rowClues.forEach((g, r) => {
        showOrder(g, shown('row', r), hasLine(scramble, 'row', r));
        if (hasLine(scramble, 'row', r)) g.group.ariaLabel = scrambleLabel(g, shown('row', r));
      });
      colClues.forEach((g, c) => {
        showOrder(g, shown('col', c), hasLine(scramble, 'col', c));
        if (hasLine(scramble, 'col', c)) g.group.ariaLabel = scrambleLabel(g, shown('col', c));
      });
      for (const { kind, index } of restored) {
        playOnce((kind === 'row' ? rowClues : colClues)[index].group, 'unscramble');
      }
    },
    setFakes(next, unmasked = []) {
      const relabel = new Set([...fakes.keys(), ...next.keys()]);
      fakes = next;
      rowClues.forEach((g, r) => relabel.has(lineKey('row', r)) && setNumbers(g, shown('row', r)));
      colClues.forEach((g, c) => relabel.has(lineKey('col', c)) && setNumbers(g, shown('col', c)));
      const longest = (count: number, kind: LineKind) =>
        Math.max(1, ...Array.from({ length: count }, (_, i) => shown(kind, i).length));
      root.style.setProperty('--rc', String(longest(h, 'row')));
      root.style.setProperty('--cc', String(longest(w, 'col')));
      for (const { kind, index } of unmasked) {
        playOnce((kind === 'row' ? rowClues : colClues)[index].group, 'unmasked');
      }
    },
    setSuspects(suspects) {
      rowClues.forEach((g, r) => g.group.classList.toggle('suspect', hasLine(suspects, 'row', r)));
      colClues.forEach((g, c) => g.group.classList.toggle('suspect', hasLine(suspects, 'col', c)));
    },
    setWiped(wiped) {
      rowClues.forEach((g, r) => g.group.classList.toggle('wiped', hasLine(wiped, 'row', r)));
      colClues.forEach((g, c) => g.group.classList.toggle('wiped', hasLine(wiped, 'col', c)));
    },
    setInk(next, washed = []) {
      for (const i of inked) if (!next.includes(i)) cells[i].classList.remove('inked');
      inked = new Set(next);
      for (const i of inked) cells[i].classList.add('inked');
      for (const i of washed) playOnce(cells[i], 'washed');
    },
    pickClue(onPick) {
      picker = onPick;
      root.classList.toggle('picking-clue', Boolean(onPick));
      for (const g of [...rowClues, ...colClues]) {
        if (onPick) g.group.tabIndex = 0;
        else g.group.removeAttribute('tabindex');
      }
    },
    setFog(next, lifted = []) {
      fog = next;
      const apply = (g: ClueGroup, fogged: boolean) => {
        g.group.classList.toggle('fogged', fogged);
        if (fogged) g.group.ariaLabel = fogLabel(g);
      };
      rowClues.forEach((g, r) => apply(g, hasLine(fog, 'row', r)));
      colClues.forEach((g, c) => apply(g, hasLine(fog, 'col', c)));
      for (const { kind, index } of lifted) {
        playOnce((kind === 'row' ? rowClues : colClues)[index].group, 'unfog');
      }
    },
    flashSwap(kind, a, b) {
      for (const i of [a, b]) {
        playOnce((kind === 'row' ? rowClues : colClues)[i].group, 'swapped');
        const length = kind === 'row' ? w : h;
        for (let j = 0; j < length; j++) {
          playOnce(cells[kind === 'row' ? i * w + j : j * w + i], 'swapped');
        }
      }
    },
    flashHint(indexes) {
      for (const i of indexes) playOnce(cells[i], 'hinted');
    },
    setFocus(lines) {
      const on = (kind: LineKind, i: number) => lines.some((l) => l.kind === kind && l.index === i);
      rowClues.forEach((g, r) => g.group.classList.toggle('focus', on('row', r)));
      colClues.forEach((g, c) => g.group.classList.toggle('focus', on('col', c)));
      cells.forEach((cell, i) =>
        cell.classList.toggle('focus', on('row', Math.floor(i / w)) || on('col', i % w)),
      );
    },
    highlight(r, c) {
      rowClues.forEach((g, i) => g.group.classList.toggle('hl', i === r));
      colClues.forEach((g, i) => g.group.classList.toggle('hl', i === c));
    },
  };
}
