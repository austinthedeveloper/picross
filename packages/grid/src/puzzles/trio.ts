/**
 * The trio's 2D pictures: draw it (this one), carve it (the 3D puzzle of the same id, in
 * `@picross/block`'s `puzzles/trio/`), build it (bricks). They live in `trio/`, out of free
 * play and the daily. A trio can also start from a pack picture that has a 3D pair.
 */
import { parsePuzzle, type Puzzle } from './format';
import { getPuzzle } from './index';

type JsonModules = Record<string, { default: unknown }>;
const files: JsonModules = import.meta.glob('./trio/*.json', { eager: true });

export const TRIO_PICTURES: Puzzle[] = Object.values(files).map((m) => parsePuzzle(m.default));
const byId = new Map(TRIO_PICTURES.map((p) => [p.id, p]));

/** The 2D picture a trio starts with: its own, or the pack's of the same id. */
export const trioPicture = (id: string): Puzzle | undefined => byId.get(id) ?? getPuzzle(id);
