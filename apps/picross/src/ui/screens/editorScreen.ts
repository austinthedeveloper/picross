import { editorTabs } from '../components/editorTabs';
import { Cell, createBoard, type Solution } from '@picross/grid/engine/board';
import { deriveClues } from '@picross/grid/engine/clues';
import { checkSolution, Unknown } from '@picross/grid/engine/solver';
import { readStore, writeStore } from '@picross/shared/game/storage';
import {
  parsePuzzle,
  slugify,
  stringifyPuzzle,
  toPuzzleFile,
  type Puzzle,
} from '@picross/grid/puzzles/format';
import { createBoardView } from '@picross/play-grid/ui/board/boardView';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { attachInput } from '@picross/play-grid/ui/board/input';

const MIN_SIZE = 2;
const MAX_SIZE = 30;
const DRAFT_KEY = 'picross:editor';

interface Draft {
  name: string;
  id: string;
  width: number;
  height: number;
  cells: boolean[];
}

const clampSize = (n: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n) || MIN_SIZE));

/**
 * Puzzle authoring tool: draw a picture, see its clues and whether it has a
 * unique no-guess solution, and export pack JSON.
 */
export function renderEditorScreen(app: HTMLElement): void {
  const draft = readStore<Draft>(DRAFT_KEY, {
    name: 'Untitled',
    id: 'untitled',
    width: 10,
    height: 10,
    cells: new Array<boolean>(100).fill(false),
  });
  if (draft.cells.length !== draft.width * draft.height) {
    draft.cells = new Array<boolean>(draft.width * draft.height).fill(false);
  }
  let idEdited = draft.id !== slugify(draft.name);

  const field = (label: string, input: HTMLInputElement) =>
    el('label', { className: 'field' }, [el('span', { textContent: label }), input]);
  const nameInput = el('input', { value: draft.name, maxLength: 40 });
  const idInput = el('input', { value: draft.id, maxLength: 40, pattern: '[a-z0-9-]+' });
  const sizeInput = (value: number) =>
    el('input', {
      type: 'number',
      min: String(MIN_SIZE),
      max: String(MAX_SIZE),
      value: String(value),
    });
  const widthInput = sizeInput(draft.width);
  const heightInput = sizeInput(draft.height);

  const status = el('p', { className: 'editor-status', role: 'status' });
  const output = el('textarea', { className: 'editor-json', rows: 10, spellcheck: false });
  output.setAttribute('aria-label', 'Puzzle JSON');
  const gridHost = el('div', { className: 'board-wrap editor-grid' });

  const save = () => writeStore(DRAFT_KEY, draft);
  const updateJson = () => {
    output.value = stringifyPuzzle(
      toPuzzleFile(draft.id, draft.name, draft.width, draft.height, draft.cells),
    );
  };

  const puzzleFromDraft = (): Puzzle => {
    const solution: Solution = { width: draft.width, height: draft.height, cells: draft.cells };
    return {
      id: draft.id,
      name: draft.name,
      width: draft.width,
      height: draft.height,
      solution,
      clues: deriveClues(solution),
    };
  };

  /** Rebuilds the grid (clues change with the drawing) and reruns the checker. */
  const render = () => {
    const puzzle = puzzleFromDraft();
    const view = createBoardView(puzzle);
    const board = createBoard(draft.width, draft.height);
    draft.cells.forEach((on, i) => (board.cells[i] = on ? Cell.Filled : Cell.Empty));
    view.update(board);
    view.root.ariaLabel = `Drawing grid, ${draft.width} by ${draft.height}`;

    attachInput(view.root, {
      board,
      // Drawing only fills or erases: right-click erases rather than marking.
      getTool: () => Cell.Filled,
      enabled: () => true,
      onPreview: (changes) => {
        const applied = changes.map((c) => ({
          ...c,
          to: c.to === Cell.Filled ? c.to : Cell.Empty,
        }));
        for (const c of applied) {
          board.cells[c.index] = c.to;
          view.cells[c.index].classList.toggle('filled', c.to === Cell.Filled);
        }
        return { applied, stop: false };
      },
      onCommit: () => {
        draft.cells = board.cells.map((c) => c === Cell.Filled);
        save();
        render();
      },
      onCancel: (changes) => {
        for (const c of changes) board.cells[c.index] = c.from;
        render();
      },
      onHover: (r, c) => view.highlight(r, c),
    });

    gridHost.replaceChildren(view.root);
    check(view.cells);
    updateJson();
  };

  const check = (cells: HTMLElement[]) => {
    status.className = 'editor-status';
    if (!draft.cells.includes(true)) {
      status.textContent = 'Draw a picture to check it.';
      return;
    }
    const result = checkSolution(draft.width, draft.height, draft.cells);
    if (result.status === 'unique') {
      status.textContent = '✓ Unique and solvable without guessing.';
      status.classList.add('ok');
    } else if (result.status === 'ambiguous') {
      status.textContent = `⚠ Needs guessing: ${result.unknown} cells can't be deduced from the clues (striped). Adjust the picture near them.`;
      status.classList.add('warn');
      result.grid.forEach((v, i) => cells[i].classList.toggle('unknown', v === Unknown));
    } else {
      status.textContent = 'The clues contradict each other.';
      status.classList.add('warn');
    }
  };

  /** Resizes the drawing, keeping the overlapping top-left part. */
  const resize = () => {
    const width = clampSize(Number(widthInput.value));
    const height = clampSize(Number(heightInput.value));
    widthInput.value = String(width);
    heightInput.value = String(height);
    if (width === draft.width && height === draft.height) return;
    const cells = new Array<boolean>(width * height).fill(false);
    for (let r = 0; r < Math.min(height, draft.height); r++) {
      for (let c = 0; c < Math.min(width, draft.width); c++) {
        cells[r * width + c] = draft.cells[r * draft.width + c];
      }
    }
    Object.assign(draft, { width, height, cells });
    save();
    render();
  };
  widthInput.onchange = resize;
  heightInput.onchange = resize;

  nameInput.oninput = () => {
    draft.name = nameInput.value;
    if (!idEdited) {
      draft.id = slugify(draft.name);
      idInput.value = draft.id;
    }
    save();
    updateJson();
  };
  idInput.oninput = () => {
    idEdited = true;
    draft.id = slugify(idInput.value);
    save();
    updateJson();
  };

  const message = el('span', { className: 'editor-message', role: 'status' });
  const flash = (text: string) => {
    message.textContent = text;
    window.setTimeout(() => (message.textContent = ''), 2500);
  };

  const clearBtn = el('button', {
    textContent: 'Clear',
    onclick: () => {
      draft.cells = draft.cells.map(() => false);
      save();
      render();
    },
  });
  const copyBtn = el('button', {
    textContent: 'Copy JSON',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(output.value);
        flash('Copied.');
      } catch {
        output.select();
        flash('Select and copy the JSON below.');
      }
    },
  });
  const downloadBtn = el('button', {
    textContent: 'Download',
    onclick: () => {
      const url = URL.createObjectURL(new Blob([output.value], { type: 'application/json' }));
      el('a', { href: url, download: `${draft.id || 'puzzle'}.json` }).click();
      URL.revokeObjectURL(url);
    },
  });
  const importBtn = el('button', {
    textContent: 'Load JSON',
    title: 'Load the JSON in the box below',
    onclick: () => {
      try {
        const p = parsePuzzle(JSON.parse(output.value));
        Object.assign(draft, {
          name: p.name,
          id: p.id,
          width: p.width,
          height: p.height,
          cells: [...p.solution.cells],
        });
        idEdited = draft.id !== slugify(draft.name);
        nameInput.value = draft.name;
        idInput.value = draft.id;
        widthInput.value = String(draft.width);
        heightInput.value = String(draft.height);
        save();
        render();
        flash('Loaded.');
      } catch (e) {
        flash(e instanceof Error ? e.message : 'Could not read that JSON.');
      }
    },
  });

  app.replaceChildren(
    el('main', { className: 'screen editor' }, [
      el('header', { className: 'topbar' }, [
        homeLink(),
        el('h1', { textContent: 'Puzzle editor' }),
      ]),
      editorTabs('flat'),
      el('div', { className: 'editor-fields' }, [
        field('Name', nameInput),
        field('ID', idInput),
        field('Width', widthInput),
        field('Height', heightInput),
      ]),
      el('p', {
        className: 'help',
        textContent: 'Click or drag to draw. Drag from a filled cell (or right-click) to erase.',
      }),
      gridHost,
      status,
      el('div', { className: 'editor-actions' }, [
        clearBtn,
        copyBtn,
        downloadBtn,
        importBtn,
        message,
      ]),
      output,
      el('p', {
        className: 'help',
        textContent:
          'To add it to the game, save the JSON in src/puzzles/pack/ and add its id to ORDER in src/puzzles/index.ts.',
      }),
    ]),
  );
  render();
}
