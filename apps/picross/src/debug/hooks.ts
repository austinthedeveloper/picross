/**
 * How the debug panel (#65) reaches into the game. The game only touches this
 * behind `import.meta.env.VITE_DEBUG === '1'`, so a production build drops those
 * lines, this module, and the panel entirely (CI greps the bundle to prove it).
 */
const KEY = 'picross:debug';

function read(): { infiniteHealth?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export const debug = {
  /** HP and hearts never drop. */
  infiniteHealth: () => Boolean(read().infiniteHealth),
  setInfiniteHealth(on: boolean) {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), infiniteHealth: on }));
  },
  /** Set by the game screen while a board is up. */
  board: null as null | { solve(): void },
  /** Set by a fight while it's up. */
  fight: null as null | { damage(amount: number): void; nextPhase(): void },
};
