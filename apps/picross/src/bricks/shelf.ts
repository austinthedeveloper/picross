/**
 * The bricks route's save, on this device only (`picross:bricks`): the shelf of toys built
 * so far, each with its picture, the layer each build in progress is on, and the step each
 * real-bricks manual is open on. No DOM.
 */
import { readStore } from '@picross/shared/game/storage';

export const BRICKS_KEY = 'picross:bricks';

/** A toy on the shelf. */
export interface ShelfToy {
  id: string;
  /** How many times it's been built. */
  times: number;
  /** A picture of the toy as built (a data URL), when the device had room for it. */
  picture?: string;
}

export interface BricksSave {
  /** In the order they were first built. */
  shelf: ShelfToy[];
  /** A build left partway: the layer it's on (0 at the bottom), by model. */
  progress: Record<string, number>;
  /** The real-bricks manual's step for each model it's been opened on (0 is the parts). */
  steps?: Record<string, number>;
}

const empty = (): BricksSave => ({ shelf: [], progress: {} });

export const loadBricks = (): BricksSave => readStore(BRICKS_KEY, empty());

/**
 * Saves, or returns false when storage is full or blocked. If it's full, the toys' pictures
 * go first (the shelf draws them from their models instead).
 */
function save(data: BricksSave): boolean {
  const attempt = (d: BricksSave) => {
    try {
      localStorage.setItem(BRICKS_KEY, JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  };
  if (attempt(data)) return true;
  const newest = data.shelf.at(-1)?.id;
  // Keep the newest toy's picture if anything's: it's the one just put up.
  const lighter = {
    ...data,
    shelf: data.shelf.map((t) => (t.id === newest ? t : { id: t.id, times: t.times })),
  };
  if (attempt(lighter)) return true;
  return attempt({ ...data, shelf: data.shelf.map(({ id, times }) => ({ id, times })) });
}

export const getShelf = (): ShelfToy[] => loadBricks().shelf;

export const isBuilt = (id: string): boolean => getShelf().some((t) => t.id === id);

/** A finished build goes on the shelf (or, built again, gets its new picture). */
export function putOnShelf(id: string, picture?: string): ShelfToy {
  const data = loadBricks();
  const old = data.shelf.find((t) => t.id === id);
  const toy: ShelfToy = { id, times: (old?.times ?? 0) + 1, picture: picture ?? old?.picture };
  data.shelf = old ? data.shelf.map((t) => (t.id === id ? toy : t)) : [...data.shelf, toy];
  delete data.progress[id];
  save(data);
  return toy;
}

/** The layer a build in progress is on, or 0. */
export const savedLayer = (id: string): number => loadBricks().progress[id] ?? 0;

/** Remembers that a build is on `layer`, so it picks up there next time. */
export function saveLayer(id: string, layer: number): void {
  const data = loadBricks();
  if (layer > 0) data.progress[id] = layer;
  else delete data.progress[id];
  save(data);
}

/** The step a model's real-bricks manual was last on, or 0 (the parts list). */
export const savedStep = (id: string): number => loadBricks().steps?.[id] ?? 0;

export function saveStep(id: string, step: number): void {
  const data = loadBricks();
  data.steps = { ...data.steps, [id]: step };
  if (!step) delete data.steps[id];
  save(data);
}

/** Start over: the build goes back to the bottom layer. */
export const clearProgress = (id: string): void => saveLayer(id, 0);

/** Takes every toy off the shelf, and every build back to the start (a grown-up's choice). */
export function clearShelf(): void {
  save(empty());
}
