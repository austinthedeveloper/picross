/**
 * The app's two games by board: Flat (the 2D game) and Cubed (the 3D one, under `#/cubed`).
 * One home screen opens both (#152); where the choice matters (free play, the editor) the
 * screen has a tab for each.
 */
export type GameKind = 'flat' | 'cubed';

/** Where each game's screens start: the 2D game's at the app's root, Cubed's under `#/cubed`. */
const HREF: Record<GameKind, string> = { flat: '#/', cubed: '#/cubed' };

export function gameHref(target: GameKind): string {
  return HREF[target];
}
