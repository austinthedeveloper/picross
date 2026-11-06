/**
 * Finding the next puzzle to play (#114). Both skip what's solved, so working
 * through hundreds of puzzles doesn't mean stepping over the ones you've done.
 */
interface HasId {
  id: string;
}

/**
 * The next unsolved puzzle after `currentId`, wrapping around to the start of the
 * list. Never the current one. Null when nothing else is left.
 */
export function nextUnsolved<T extends HasId>(
  list: readonly T[],
  currentId: string,
  isSolved: (id: string) => boolean,
): T | null {
  const at = list.findIndex((p) => p.id === currentId);
  for (let step = 1; step < list.length; step++) {
    const candidate = list[(at + step) % list.length];
    if (candidate.id !== currentId && !isSolved(candidate.id)) return candidate;
  }
  return null;
}

/** Any unsolved puzzle, or null when everything's solved. */
export function randomUnsolved<T extends HasId>(
  list: readonly T[],
  isSolved: (id: string) => boolean,
  rand: () => number = Math.random,
): T | null {
  const open = list.filter((p) => !isSolved(p.id));
  return open.length ? open[Math.floor(rand() * open.length)] : null;
}
