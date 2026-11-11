/**
 * The routes where the player is at a board: a puzzle, a fight, the daily, a mural tile, an
 * editor, in either game. A new version of the game never reloads the page there
 * (updates.ts waits until they leave). Cubed's are here rather than in cubed/routes.ts so
 * this check doesn't load Cubed's chunk.
 */
const BOARDS: RegExp[] = [
  /^#\/play\/[\w-]+$/,
  /^#\/run\/play$/,
  /^#\/daily$/,
  /^#\/mural\/[\w-]+\/\d+$/,
  /^#\/editor$/,
  // Picross Cubed (cubed/routes.ts): a puzzle, the tutorial, the daily, a diorama tile, a
  // story fight, the editor, and a shared puzzle or a play-test.
  /^#\/cubed\/(play\/[\w-]+|tutorial|daily|diorama\/[\w-]+\/\d+|story\/play|editor|p\/[\w-]+(\/test)?)$/,
];

/** Whether `hash` (`location.hash`) is a screen with a board on it. */
export function isBoardRoute(hash: string): boolean {
  return BOARDS.some((board) => board.test(hash));
}
