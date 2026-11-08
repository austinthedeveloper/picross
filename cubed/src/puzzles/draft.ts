import { indexOf, volume, type Dims } from '../engine/volume';
import { MAX_LINE } from '../engine/solver';
import { COLORS, type ColorName, type PuzzleFile } from './format';

/** A puzzle being drawn in the editor: per cube, 0 for empty or 1 + an index into COLORS. */
export interface Draft {
  id: string;
  name: string;
  dims: Dims;
  cells: Uint8Array;
}

export const newDraft = (dims: Dims = { x: 6, y: 6, z: 6 }): Draft => ({
  id: 'my-puzzle',
  name: 'My puzzle',
  dims,
  cells: new Uint8Array(volume(dims)),
});

export const clampSide = (n: number) => Math.max(1, Math.min(MAX_LINE, Math.round(n) || 1));

/** The draft at a new size, keeping what fits (anchored at the bottom back left). */
export function resizeDraft(draft: Draft, dims: Dims): Draft {
  const next = { ...draft, dims, cells: new Uint8Array(volume(dims)) };
  for (let y = 0; y < Math.min(dims.y, draft.dims.y); y++) {
    for (let z = 0; z < Math.min(dims.z, draft.dims.z); z++) {
      for (let x = 0; x < Math.min(dims.x, draft.dims.x); x++) {
        next.cells[indexOf(dims, { x, y, z })] = draft.cells[indexOf(draft.dims, { x, y, z })];
      }
    }
  }
  return next;
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'my-puzzle';

/** The draft as a puzzle file. Colors get letters a, b, c… in the order they're first used. */
export function draftToFile(draft: Draft, extra: Partial<PuzzleFile> = {}): PuzzleFile {
  const letters = new Map<number, string>();
  const colors: Record<string, ColorName> = {};
  for (const c of draft.cells) {
    if (c && !letters.has(c)) {
      const letter = String.fromCharCode(97 + letters.size);
      letters.set(c, letter);
      colors[letter] = COLORS[c - 1];
    }
  }
  const { x: X, y: Y, z: Z } = draft.dims;
  const layers: string[][] = [];
  for (let y = 0; y < Y; y++) {
    const layer: string[] = [];
    for (let z = 0; z < Z; z++) {
      let row = '';
      for (let x = 0; x < X; x++)
        row += letters.get(draft.cells[indexOf(draft.dims, { x, y, z })]) ?? '.';
      layer.push(row);
    }
    layers.push(layer);
  }
  return {
    id: slug(draft.id === 'my-puzzle' ? draft.name : draft.id),
    name: draft.name,
    colors,
    layers,
    ...extra,
  };
}

/** A puzzle file back into a draft, for importing. Throws on a malformed file. */
export function fileToDraft(file: PuzzleFile): Draft {
  const dims = {
    y: file.layers.length,
    z: file.layers[0]?.length ?? 0,
    x: file.layers[0]?.[0]?.length ?? 0,
  };
  if (!Array.isArray(file.layers) || !dims.x || !dims.y || !dims.z) {
    throw new Error('That puzzle has no layers.');
  }
  if (Math.max(dims.x, dims.y, dims.z) > MAX_LINE) {
    throw new Error(`It's bigger than ${MAX_LINE} cubes on a side.`);
  }
  const ragged = file.layers.some(
    (layer) => layer.length !== dims.z || layer.some((row) => row.length !== dims.x),
  );
  if (ragged) throw new Error('Its layers and rows aren\u2019t all the same size.');
  const draft = {
    id: typeof file.id === 'string' && file.id ? file.id : 'my-puzzle',
    name: typeof file.name === 'string' && file.name.trim() ? file.name.trim() : 'My puzzle',
    dims,
    cells: new Uint8Array(volume(dims)),
  };
  file.layers.forEach((layer, y) =>
    layer.forEach((row, z) =>
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        const color = COLORS.indexOf(file.colors[ch]);
        if (color < 0) throw new Error(`No color for "${ch}".`);
        draft.cells[indexOf(dims, { x, y, z })] = color + 1;
      }),
    ),
  );
  return draft;
}
