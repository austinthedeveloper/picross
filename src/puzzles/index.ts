import { parsePuzzle, type Puzzle } from './format';

const files = import.meta.glob<{ default: unknown }>('./pack/*.json', { eager: true });

/** Starter pack in play order. */
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
];

const byId = new Map<string, Puzzle>();
for (const mod of Object.values(files)) {
  const puzzle = parsePuzzle(mod.default);
  byId.set(puzzle.id, puzzle);
}

export const puzzles: Puzzle[] = [
  ...ORDER.flatMap((id) => byId.get(id) ?? []),
  ...[...byId.values()].filter((p) => !ORDER.includes(p.id)),
];

export function getPuzzle(id: string): Puzzle | undefined {
  return byId.get(id);
}
