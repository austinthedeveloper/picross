/**
 * Backdrops: the place a scene happens, as a one-color pixel picture behind the portraits.
 * Written like a puzzle's solution ("#" and "."), but never played. They live in
 * src/puzzles/backdrops/ and a scene picks one with `"backdrop": "<id>"`.
 */
export interface Backdrop {
  id: string;
  width: number;
  height: number;
  /** Rows of "#" (drawn) and "." (empty). */
  rows: string[];
}

export function parseBackdrop(data: unknown): Backdrop {
  const file = data as Partial<Backdrop>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid backdrop${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  const rows = file.rows;
  if (!Array.isArray(rows) || !rows.length) fail('rows must be rows of # and .');
  const width = rows![0].length;
  if (!rows!.every((row) => row.length === width && /^[#.]+$/.test(row))) {
    fail('rows must be the same width, using only # and .');
  }
  return { id: file.id!, width, height: rows!.length, rows: rows! };
}

const files = import.meta.glob<{ default: unknown }>('./backdrops/*.json', { eager: true });
const byId = new Map<string, Backdrop>();
for (const mod of Object.values(files)) {
  const backdrop = parseBackdrop(mod.default);
  byId.set(backdrop.id, backdrop);
}

export function getBackdrop(id: string): Backdrop | undefined {
  return byId.get(id);
}

export const backdrops = [...byId.values()];
