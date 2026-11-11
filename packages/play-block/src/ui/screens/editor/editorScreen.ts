import { indexOf, type Axis, type Dims } from '@picross/block/engine/volume';
import { readStore, writeStore } from '@picross/shared/game/storage';
import type { CheckResult } from '@picross/block/puzzles/check';
import { difficultyOf } from '@picross/block/puzzles/difficulty';
import {
  clampSide,
  draftToFile,
  fileToDraft,
  newDraft,
  resizeDraft,
  type Draft,
} from '@picross/block/puzzles/draft';
import { COLORS, parsePuzzle, type PuzzleFile } from '@picross/block/puzzles/format';
import { encodeShare } from '@picross/block/puzzles/share';
import { BlockView } from '../../board/blockView';
import { attachInput } from '../../board/input';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';
import { playSound } from '@picross/shared/ui/sound';

const KEY = 'picross3d:editor';
const MAX_UNDO = 100;

interface Stored {
  id: string;
  name: string;
  dims: Dims;
  cells: string;
  ratio: number;
}

function load(): { draft: Draft; ratio: number } {
  const s = readStore<Partial<Stored>>(KEY, {});
  if (!s.dims || !s.cells) return { draft: newDraft(), ratio: 0.5 };
  const draft = newDraft(s.dims);
  draft.id = s.id ?? draft.id;
  draft.name = s.name ?? draft.name;
  // Each cube is one character: 0 empty, else a code point from 'a' for COLORS[n].
  [...s.cells].forEach((ch, i) => (draft.cells[i] = ch === '0' ? 0 : ch.charCodeAt(0) - 96));
  // A saved draft that can't be drawn (an old bug, a hand edit) starts fresh rather than
  // breaking the editor for good.
  try {
    if (draft.cells.some(Boolean)) parsePuzzle(draftToFile(draft, { id: 'preview' }));
  } catch {
    return { draft: newDraft(), ratio: 0.5 };
  }
  return { draft, ratio: s.ratio ?? 0.5 };
}

function save(draft: Draft, ratio: number): void {
  const cells = [...draft.cells].map((c) => (c ? String.fromCharCode(96 + c) : '0')).join('');
  writeStore(KEY, { id: draft.id, name: draft.name, dims: draft.dims, cells, ratio });
}

/** The puzzle editor (#/editor): draw a shape layer by layer, check it, share it. */
export function renderEditorScreen(root: HTMLElement): () => void {
  let { draft, ratio } = load();
  let layer = 0;
  let color = COLORS.indexOf('coral') + 1;
  let past: Uint8Array[] = [];
  let future: Uint8Array[] = [];
  let lastCheck: { file: PuzzleFile; result: CheckResult } | null = null;

  // --- The 3D preview: the shape in color, turnable ------------------------------------

  const previewPuzzle = () => parsePuzzle(draftToFile(draft, { id: 'preview' }));
  const empty = () => !draft.cells.some(Boolean);
  // An empty draft can't be parsed (no cubes), so the preview shows a stand-in.
  const stand = parsePuzzle({
    id: 'preview',
    name: 'Preview',
    colors: { a: 'stone' },
    layers: [['a']],
  });
  const view = new BlockView(empty() ? stand : previewPuzzle(), new Uint8Array(1));
  view.revealed = true;
  const detachInput = attachInput(view, {
    acting: () => false,
    begin: () => {},
    extend: () => {},
    end: () => {},
    hover: () => {},
    reset: () => view.animateTo(-0.6, 0.5, 1),
  });
  // Until there's a shape, the preview says how to start instead of showing the stand-in.
  const previewHint = el('p', {
    className: 'preview-hint',
    textContent: 'Your shape appears here as you draw. Pick a color and tap the grid below.',
  });
  const refreshPreview = () => {
    const p = empty() ? stand : previewPuzzle();
    view.setPuzzle(p, new Uint8Array(p.solution.length));
    view.canvas.hidden = empty();
    previewHint.hidden = !empty();
  };
  refreshPreview();

  // --- Controls --------------------------------------------------------------------------

  const name = el('input', { type: 'text', value: draft.name, maxLength: 40 });
  name.ariaLabel = 'Name';
  const sizeInputs = (['x', 'y', 'z'] as Axis[]).map((axis) => {
    const input = el('input', {
      type: 'number',
      min: '1',
      max: '15',
      value: String(draft.dims[axis]),
      className: 'size-input',
    });
    input.ariaLabel = { x: 'Width', y: 'Height', z: 'Depth' }[axis];
    return input;
  });
  const layerLabel = el('span', { className: 'layer-label' });
  const up = el('button', { textContent: '▲', title: 'Layer up' });
  up.ariaLabel = 'Layer up';
  const down = el('button', { textContent: '▼', title: 'Layer down' });
  down.ariaLabel = 'Layer down';
  const grid = el('div', { className: 'editor-grid', role: 'group' });
  grid.ariaLabel = 'Layer grid: arrow keys move, Space or Enter paints';
  /** The cell the keyboard is on, within the layer (row × width + column). */
  let focusAt = 0;
  const undo = el('button', { className: 'icon', textContent: '↶' });
  undo.ariaLabel = 'Undo';
  const redo = el('button', { className: 'icon', textContent: '↷' });
  redo.ariaLabel = 'Redo';
  const clear = el('button', { textContent: 'Clear layer' });

  const swatches = [0, ...COLORS.map((_, i) => i + 1)].map((c) => {
    const b = el('button', {
      className: `swatch${c ? '' : ' eraser'}`,
      title: c ? COLORS[c - 1] : 'Eraser',
      onclick: () => {
        color = c;
        renderSwatches();
      },
    });
    b.ariaLabel = c ? COLORS[c - 1] : 'Eraser';
    if (c) b.style.setProperty('--swatch', `var(--vox-${COLORS[c - 1]})`);
    else b.textContent = '⌫';
    return b;
  });
  const renderSwatches = () =>
    swatches.forEach((b, i) => b.setAttribute('aria-pressed', String(i === color)));

  const verdict = el('p', { className: 'verdict', role: 'status' });
  const ratioInput = el('input', {
    type: 'range',
    min: '0',
    max: '0.8',
    step: '0.05',
    value: String(ratio),
  });
  ratioInput.ariaLabel = 'Clues to hide';
  const ratioLabel = el('span', { className: 'ratio-label' });
  const playTest = el('button', { className: 'button primary', textContent: 'Play-test' });
  const share = el('button', { textContent: 'Copy share link' });
  const exportJson = el('button', { textContent: 'Export JSON' });
  const importJson = el('button', { textContent: 'Import JSON' });
  const io = el('textarea', { className: 'editor-io', rows: 6, hidden: true });
  io.ariaLabel = 'Puzzle JSON';
  const ioApply = el('button', { textContent: 'Load it', hidden: true });

  root.replaceChildren(
    el('div', { className: 'screen editor' }, [
      el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: 'Editor' })]),
      el('div', { className: 'editor-meta' }, [
        el('label', {}, ['Name ', name]),
        el('span', { className: 'size-inputs' }, [
          sizeInputs[0],
          ' × ',
          sizeInputs[1],
          ' × ',
          sizeInputs[2],
        ]),
      ]),
      el('div', { className: 'editor-main' }, [
        el('div', { className: 'stage preview' }, [view.canvas, previewHint]),
        el('div', { className: 'editor-draw' }, [
          el('div', { className: 'layer-bar' }, [
            down,
            layerLabel,
            up,
            el('span', { className: 'actions' }, [undo, redo]),
            clear,
          ]),
          grid,
          el('p', {
            className: 'help',
            textContent: 'Rows run from the back (top) to the front (bottom). Drag to paint.',
          }),
          el('div', { className: 'swatches', role: 'group', ariaLabel: 'Color' }, swatches),
        ]),
      ]),
      el('section', { className: 'editor-check' }, [
        verdict,
        el('label', { className: 'ratio' }, ['Hide clues ', ratioInput, ratioLabel]),
        el('div', { className: 'end-actions' }, [playTest, share, exportJson, importJson]),
        io,
        ioApply,
      ]),
    ]),
  );

  // --- Drawing ---------------------------------------------------------------------------

  const cellsOfLayer = () => {
    const out: HTMLElement[] = [];
    const { x: X, z: Z } = draft.dims;
    grid.style.setProperty('--cols', String(X));
    for (let z = 0; z < Z; z++) {
      for (let x = 0; x < X; x++) {
        const i = indexOf(draft.dims, { x, y: layer, z });
        const below = layer > 0 ? draft.cells[indexOf(draft.dims, { x, y: layer - 1, z })] : 0;
        const c = draft.cells[i];
        const cell = el('button', {
          type: 'button',
          className: `ecell${c ? ' on' : ''}${below ? ' below' : ''}`,
        });
        cell.dataset.i = String(i);
        cell.ariaLabel = `Row ${z + 1}, column ${x + 1}: ${c ? COLORS[c - 1] : 'empty'}${below ? ', cube below' : ''}`;
        // One tab stop for the whole grid; arrows move within it.
        cell.tabIndex = z * X + x === focusAt ? 0 : -1;
        if (c) cell.style.setProperty('--swatch', `var(--vox-${COLORS[c - 1]})`);
        if (unknown.has(i)) cell.classList.add('unknown');
        out.push(cell);
      }
    }
    return out;
  };

  let unknown = new Set<number>();
  function render() {
    const hadFocus = grid.contains(document.activeElement);
    focusAt = Math.min(focusAt, draft.dims.x * draft.dims.z - 1);
    grid.replaceChildren(...cellsOfLayer());
    if (hadFocus) (grid.children[focusAt] as HTMLElement | undefined)?.focus();
    layerLabel.textContent = `Layer ${layer + 1} of ${draft.dims.y}`;
    up.disabled = layer >= draft.dims.y - 1;
    down.disabled = layer <= 0;
    undo.disabled = !past.length;
    redo.disabled = !future.length;
    ratioLabel.textContent = `${Math.round(ratio * 100)}%`;
    renderSwatches();
  }

  function remember() {
    past.push(Uint8Array.from(draft.cells));
    if (past.length > MAX_UNDO) past.shift();
    future = [];
  }

  function changed() {
    save(draft, ratio);
    refreshPreview();
    render();
    scheduleCheck();
  }

  let painting: number | null = null;
  const paintAt = (target: EventTarget | null) => {
    const cell = (target as HTMLElement)?.closest?.('.ecell') as HTMLElement | null;
    if (!cell || painting === null) return;
    const i = Number(cell.dataset.i);
    if (draft.cells[i] === painting) return;
    draft.cells[i] = painting;
    cell.classList.toggle('on', painting !== 0);
    if (painting) cell.style.setProperty('--swatch', `var(--vox-${COLORS[painting - 1]})`);
    playSound(painting ? 'fill' : 'erase');
  };
  grid.onpointerdown = (e) => {
    const cell = (e.target as HTMLElement).closest('.ecell') as HTMLElement | null;
    if (!cell) return;
    e.preventDefault();
    grid.setPointerCapture(e.pointerId);
    remember();
    const i = Number(cell.dataset.i);
    // Starting on a cube of the chosen color erases instead, like a toggle.
    painting = draft.cells[i] === color && color !== 0 ? 0 : color;
    paintAt(cell);
  };
  grid.onpointermove = (e) => {
    if (painting === null) return;
    paintAt(document.elementFromPoint(e.clientX, e.clientY));
  };
  // Keyboard: arrows move, Space or Enter paints the cell with the chosen color (or clears
  // it if it's already that color), like a tap.
  grid.onkeydown = (e) => {
    const X = draft.dims.x;
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -X,
      ArrowDown: X,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = focusAt + moves[e.key];
    const sameRow = Math.floor(next / X) === Math.floor(focusAt / X);
    if (next < 0 || next >= X * draft.dims.z || (Math.abs(moves[e.key]) === 1 && !sameRow)) return;
    focusAt = next;
    [...grid.children].forEach((c, k) => ((c as HTMLElement).tabIndex = k === focusAt ? 0 : -1));
    (grid.children[focusAt] as HTMLElement).focus();
  };
  grid.onclick = (e) => {
    // Pointer taps paint on pointerdown; this is for Space and Enter (a click with no pointer).
    if ((e as MouseEvent).detail !== 0) return;
    const cell = (e.target as HTMLElement).closest('.ecell') as HTMLElement | null;
    if (!cell) return;
    const i = Number(cell.dataset.i);
    focusAt = [...grid.children].indexOf(cell);
    remember();
    draft.cells[i] = draft.cells[i] === color && color !== 0 ? 0 : color;
    playSound(draft.cells[i] ? 'fill' : 'erase');
    changed();
  };
  grid.onpointerup = grid.onpointercancel = () => {
    if (painting === null) return;
    painting = null;
    changed();
  };

  up.onclick = () => {
    layer = Math.min(draft.dims.y - 1, layer + 1);
    render();
  };
  down.onclick = () => {
    layer = Math.max(0, layer - 1);
    render();
  };
  undo.onclick = () => {
    const prev = past.pop();
    if (!prev) return;
    future.push(Uint8Array.from(draft.cells));
    draft.cells.set(prev);
    changed();
  };
  redo.onclick = () => {
    const next = future.pop();
    if (!next) return;
    past.push(Uint8Array.from(draft.cells));
    draft.cells.set(next);
    changed();
  };
  clear.onclick = () => {
    remember();
    for (let z = 0; z < draft.dims.z; z++) {
      for (let x = 0; x < draft.dims.x; x++)
        draft.cells[indexOf(draft.dims, { x, y: layer, z })] = 0;
    }
    changed();
  };

  name.oninput = () => {
    draft.name = name.value.trim() || 'My puzzle';
    save(draft, ratio);
    // Shared links and exports carry the name, so check (and rebuild) again.
    scheduleCheck();
  };
  sizeInputs.forEach((input) => {
    input.onchange = () => {
      const [x, y, z] = sizeInputs.map((i) => clampSide(Number(i.value)));
      sizeInputs.forEach((i, k) => (i.value = String([x, y, z][k])));
      if (x === draft.dims.x && y === draft.dims.y && z === draft.dims.z) return;
      remember();
      past = [];
      draft = resizeDraft(draft, { x, y, z });
      layer = Math.min(layer, y - 1);
      changed();
    };
  });
  ratioInput.oninput = () => {
    ratio = Number(ratioInput.value);
    save(draft, ratio);
    render();
    scheduleCheck();
  };

  // --- Checking --------------------------------------------------------------------------

  const worker = new Worker(new URL('./checkWorker.ts', import.meta.url), { type: 'module' });
  let checkId = 0;
  let checkTimer = 0;
  function scheduleCheck() {
    window.clearTimeout(checkTimer);
    lastCheck = null;
    playTest.disabled = share.disabled = true;
    if (empty()) {
      verdict.textContent = 'Draw a shape to begin.';
      unknown = new Set();
      return;
    }
    verdict.textContent = 'Checking…';
    checkTimer = window.setTimeout(() => {
      const file = draftToFile(draft);
      worker.postMessage({ id: ++checkId, file, ratio });
      pending.set(checkId, file);
    }, 350);
  }
  const pending = new Map<number, PuzzleFile>();
  worker.onmessage = (e: MessageEvent<{ id: number; result: CheckResult }>) => {
    const file = pending.get(e.data.id);
    pending.delete(e.data.id);
    if (e.data.id !== checkId || !file) return;
    const { result } = e.data;
    if (result.ok) {
      lastCheck = { file: { ...file, hide: result.hide, passes: result.passes }, result };
      const band = difficultyOf({ passes: result.passes, dims: draft.dims });
      verdict.textContent = `✓ Solvable without guessing. ${result.shown} of ${result.lines} clues shown, ${band.label}.`;
      verdict.className = 'verdict ok';
      unknown = new Set();
      playTest.disabled = share.disabled = false;
    } else {
      verdict.textContent = `✗ ${result.error}${result.unknown.length ? ' They’re outlined in the layers.' : ''}`;
      verdict.className = 'verdict bad';
      unknown = new Set(result.unknown);
    }
    render();
  };

  // --- Sharing and files -----------------------------------------------------------------

  playTest.onclick = async () => {
    if (!lastCheck) return;
    location.hash = `#/p/${await encodeShare(lastCheck.file)}/test`;
  };
  share.onclick = async () => {
    if (!lastCheck) return;
    const url = `${location.href.split('#')[0]}#/p/${await encodeShare(lastCheck.file)}`;
    try {
      await navigator.clipboard.writeText(url);
      verdict.textContent = 'Share link copied.';
    } catch {
      io.hidden = false;
      io.value = url;
      io.select();
    }
  };
  exportJson.onclick = () => {
    io.hidden = false;
    ioApply.hidden = true;
    io.value = JSON.stringify(lastCheck?.file ?? draftToFile(draft), null, 2);
    io.select();
  };
  importJson.onclick = () => {
    io.hidden = false;
    ioApply.hidden = false;
    io.value = '';
    io.placeholder = 'Paste a puzzle file here';
    io.focus();
  };
  ioApply.onclick = () => {
    try {
      const next = fileToDraft(JSON.parse(io.value));
      // A shape that won't preview is reported, not saved.
      if (next.cells.some(Boolean)) parsePuzzle(draftToFile(next, { id: 'preview' }));
      // A different block: undo can't go back across the import.
      past = [];
      future = [];
      draft = next;
      name.value = draft.name;
      sizeInputs.forEach(
        (i, k) => (i.value = String([draft.dims.x, draft.dims.y, draft.dims.z][k])),
      );
      layer = 0;
      io.hidden = ioApply.hidden = true;
      changed();
    } catch (e) {
      verdict.textContent = `✗ Couldn’t load that: ${(e as Error).message}`;
      verdict.className = 'verdict bad';
    }
  };

  render();
  scheduleCheck();
  return () => {
    window.clearTimeout(checkTimer);
    worker.terminate();
    detachInput();
    view.dispose();
  };
}
