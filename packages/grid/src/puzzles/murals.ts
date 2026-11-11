import type { Solution } from '../engine/board';
import { parsePuzzle, type Puzzle } from './format';

/** A mural (#24): one big picture made of tiles, each its own puzzle. */
export interface MuralFile {
  id: string;
  name: string;
  /** Position in the murals list (lowest first). */
  order: number;
  /** Tile size in cells; the picture's width and height must be multiples of it. */
  tile: number;
  solution: string[];
}

export interface Mural {
  id: string;
  name: string;
  order: number;
  /** Tiles across and down. */
  across: number;
  down: number;
  /** The tiles, row by row. Each is a puzzle with its own id, e.g. "whale-3". */
  tiles: Puzzle[];
  /** The whole picture. */
  solution: Solution;
}

export function parseMural(data: unknown): Mural {
  const file = data as Partial<MuralFile>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid mural${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  if (typeof file.name !== 'string' || !file.name) fail('missing name');
  if (!Number.isFinite(file.order)) fail('order must be a number');
  if (!Number.isInteger(file.tile) || file.tile! < 5) fail('tile must be 5 or more');
  const rows = file.solution;
  if (!Array.isArray(rows) || !rows.length || typeof rows[0] !== 'string') {
    fail('solution must be rows of # and .');
  }
  const t = file.tile!;
  const width = rows![0].length;
  const height = rows!.length;
  if (width % t || height % t)
    fail(`a ${width}×${height} picture doesn't split into ${t}×${t} tiles`);
  if (rows!.length < 2 * t && width < 2 * t) fail('a mural needs at least two tiles');
  const across = width / t;
  const down = height / t;

  // Each tile is a puzzle (parsePuzzle checks the rows and that it isn't empty).
  const tiles = Array.from({ length: across * down }, (_, n) => {
    const [tr, tc] = [Math.floor(n / across), n % across];
    return parsePuzzle({
      id: `${file.id}-${n + 1}`,
      name: `${file.name}, tile ${n + 1}`,
      width: t,
      height: t,
      solution: rows!.slice(tr * t, (tr + 1) * t).map((r) => r.slice(tc * t, (tc + 1) * t)),
    });
  });
  const whole = parsePuzzle({ id: file.id, name: file.name, width, height, solution: rows });
  return {
    id: file.id!,
    name: file.name!,
    order: file.order!,
    across,
    down,
    tiles,
    solution: whole.solution,
  };
}

const files = import.meta.glob<{ default: unknown }>('./murals/*.json', { eager: true });

/** Every mural, in list order. */
export const murals: Mural[] = Object.values(files)
  .map((mod) => parseMural(mod.default))
  .sort((a, b) => a.order - b.order);

export function getMural(id: string): Mural | undefined {
  return murals.find((m) => m.id === id);
}
