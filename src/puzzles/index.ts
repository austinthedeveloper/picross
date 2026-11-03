import { parsePuzzle, type Puzzle } from './format';

type JsonModules = Record<string, { default: unknown }>;
const packFiles: JsonModules = import.meta.glob('./pack/*.json', { eager: true });
/** Puzzles used only by run encounters; they don't appear on the puzzle list. */
const runFiles: JsonModules = import.meta.glob('./run/*.json', { eager: true });

/** Free-play pack in play order. */
const ORDER = [
  'heart',
  'arrow',
  'smile',
  'key',
  'house',
  'mushroom',
  'cat',
  'fish',
  'note',
  'tree',
  'rocket',
  'sailboat',
  'lighthouse',
  'anchor',
  'mug',
  'turtle',
  'robot',
  'balloon',
  'cactus',
  'castle',
  'guitar',
  'teapot',
];

const byId = new Map<string, Puzzle>();
const load = (files: JsonModules) =>
  Object.values(files).map((mod) => {
    const puzzle = parsePuzzle(mod.default);
    if (byId.has(puzzle.id)) throw new Error(`Duplicate puzzle id "${puzzle.id}"`);
    byId.set(puzzle.id, puzzle);
    return puzzle;
  });
const pack = load(packFiles);
load(runFiles);

/** The free-play puzzle list, in play order. */
export const puzzles: Puzzle[] = [
  ...ORDER.flatMap((id) => pack.find((p) => p.id === id) ?? []),
  ...pack.filter((p) => !ORDER.includes(p.id)),
];

/** Every puzzle, including run-only ones. */
export const allPuzzles: Puzzle[] = [...byId.values()];

export function getPuzzle(id: string): Puzzle | undefined {
  return byId.get(id);
}
