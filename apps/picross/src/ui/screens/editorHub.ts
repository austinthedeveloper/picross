/**
 * The one editor (#159) at `#/editor`: start a new puzzle on either board, or pick up a
 * draft. Each board keeps its draft where its editor always has (`picross:editor` for Flat,
 * `picross3d:editor` for Cubed), so drafts from before carry on, and both show here in one
 * list, marked by their board. Each opens that board's editor: Flat's at `#/editor/flat`,
 * Cubed's at `#/cubed/editor` (it brings three.js, so it loads on demand).
 *
 * This screen reads and writes only the drafts' storage, so it loads neither editor.
 */
import { gameHref } from '@picross/shared/game/boards';
import { readStore, writeStore } from '@picross/shared/game/storage';
import { homeLink } from '@picross/shared/ui/components/homeLink';
import { el } from '@picross/shared/ui/dom';

export const FLAT_DRAFT = 'picross:editor';
export const CUBED_DRAFT = 'picross3d:editor';
const FLAT_EDITOR = '#/editor/flat';
const CUBED_EDITOR = `${gameHref('cubed')}/editor`;

/** The sizes a new puzzle may be (each editor's own limits). */
const FLAT_SIDE = { min: 2, max: 30, start: 10 };
const CUBED_SIDE = { min: 1, max: 15, start: 6 };

/** A draft as the list shows it. */
export interface DraftCard {
  board: 'flat' | 'cubed';
  name: string;
  size: string;
  /** Squares or cubes drawn so far. */
  drawn: number;
  href: string;
}

/** Both boards' drafts, Flat first; a board with nothing drawn has none. */
export function drafts(): DraftCard[] {
  const out: DraftCard[] = [];
  const flat = readStore<{ name?: string; width?: number; height?: number; cells?: boolean[] }>(
    FLAT_DRAFT,
    {},
  );
  const flatDrawn = flat.cells?.filter(Boolean).length ?? 0;
  if (flatDrawn && flat.width && flat.height) {
    out.push({
      board: 'flat',
      name: flat.name || 'Untitled',
      size: `${flat.width}×${flat.height}`,
      drawn: flatDrawn,
      href: FLAT_EDITOR,
    });
  }
  const cubed = readStore<{
    name?: string;
    dims?: { x: number; y: number; z: number };
    cells?: string;
  }>(CUBED_DRAFT, {});
  const cubedDrawn = [...(cubed.cells ?? '')].filter((c) => c !== '0').length;
  if (cubedDrawn && cubed.dims) {
    out.push({
      board: 'cubed',
      name: cubed.name || 'My puzzle',
      size: `${cubed.dims.x}×${cubed.dims.y}×${cubed.dims.z}`,
      drawn: cubedDrawn,
      href: CUBED_EDITOR,
    });
  }
  return out;
}

const clamp = (n: number, { min, max, start }: typeof FLAT_SIDE) =>
  Math.min(max, Math.max(min, Math.round(n) || start));

/** A fresh Flat draft, `width` by `height`, in place of the old one. */
export function newFlatDraft(width: number, height: number): void {
  const w = clamp(width, FLAT_SIDE);
  const h = clamp(height, FLAT_SIDE);
  writeStore(FLAT_DRAFT, {
    name: 'Untitled',
    id: 'untitled',
    width: w,
    height: h,
    cells: new Array<boolean>(w * h).fill(false),
  });
}

/** A fresh Cubed draft, `x` by `y` by `z`, in place of the old one (the editor's format). */
export function newCubedDraft(x: number, y: number, z: number): void {
  const dims = { x: clamp(x, CUBED_SIDE), y: clamp(y, CUBED_SIDE), z: clamp(z, CUBED_SIDE) };
  writeStore(CUBED_DRAFT, {
    id: 'my-puzzle',
    name: 'My puzzle',
    dims,
    cells: '0'.repeat(dims.x * dims.y * dims.z),
    ratio: 0.5,
  });
}

function sideInput(label: string, side: typeof FLAT_SIDE): HTMLInputElement {
  const input = el('input', {
    type: 'number',
    min: String(side.min),
    max: String(side.max),
    value: String(side.start),
  });
  input.ariaLabel = label;
  return input;
}

/** One board's "new puzzle" row: its size inputs and Start. */
function newPuzzle(
  board: 'flat' | 'cubed',
  title: string,
  inputs: HTMLInputElement[],
  start: (sides: number[]) => void,
): HTMLElement {
  const existing = drafts().find((d) => d.board === board);
  const button = el('button', {
    className: 'button primary',
    textContent: 'Start',
    onclick: () => {
      // Each board keeps one draft: starting over replaces it, so ask first.
      if (existing && !confirm(`Replace your ${title} draft, “${existing.name}”?`)) return;
      start(inputs.map((i) => Number(i.value)));
      location.hash = board === 'flat' ? FLAT_EDITOR : CUBED_EDITOR;
    },
  });
  const sizes = inputs.flatMap((input, i) => (i ? [' × ', input] : [input]));
  return el('div', { className: `editor-new ${board}` }, [
    el('h3', { textContent: title }),
    el('span', { className: 'editor-new-size' }, sizes),
    button,
  ]);
}

function draftCard(d: DraftCard): HTMLElement {
  return el('a', { className: `draft-card ${d.board}`, href: d.href }, [
    el('span', { className: 'draft-board', textContent: d.board === 'flat' ? 'Flat' : 'Cubed' }),
    el('span', { className: 'draft-name', textContent: d.name }),
    el('span', {
      className: 'draft-meta',
      textContent: `${d.size} · ${d.drawn} ${d.board === 'flat' ? 'squares' : 'cubes'} drawn`,
    }),
  ]);
}

/** Renders the editor's start at `#/editor`. */
export function renderEditorHub(app: HTMLElement): void {
  const list = drafts();
  app.replaceChildren(
    el('main', { className: 'screen editor-hub' }, [
      el('header', { className: 'topbar' }, [homeLink(), el('h1', { textContent: 'Editor' })]),
      el('p', {
        className: 'lede',
        textContent: 'Draw a picture, check it solves without guessing, and share it as a link.',
      }),
      el('section', { className: 'editor-starts', ariaLabel: 'New puzzle' }, [
        el('h2', { textContent: 'New puzzle' }),
        newPuzzle(
          'flat',
          'Flat',
          [sideInput('Width', FLAT_SIDE), sideInput('Height', FLAT_SIDE)],
          ([w, h]) => newFlatDraft(w, h),
        ),
        newPuzzle(
          'cubed',
          'Cubed',
          [
            sideInput('Width', CUBED_SIDE),
            sideInput('Height', CUBED_SIDE),
            sideInput('Depth', CUBED_SIDE),
          ],
          ([x, y, z]) => newCubedDraft(x, y, z),
        ),
      ]),
      el('section', { className: 'editor-drafts', ariaLabel: 'Drafts' }, [
        el('h2', { textContent: 'Drafts' }),
        ...(list.length
          ? list.map(draftCard)
          : [el('p', { className: 'empty-list', textContent: 'No drafts yet. Start one above.' })]),
      ]),
    ]),
  );
}
