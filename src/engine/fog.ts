/** Clues hidden by fog (#30): row and column indexes. */
export interface Fog {
  rows: number[];
  cols: number[];
}

export const noFog = (): Fog => ({ rows: [], cols: [] });

export const isFogged = (fog: Fog, kind: 'row' | 'col', index: number) =>
  (kind === 'row' ? fog.rows : fog.cols).includes(index);

/**
 * The fog left after a line is completed. Completing a line clears its own
 * fog and the fog on every crossing line it meets at a filled cell.
 * `filledAt(i)` says whether the completed line's cell `i` (the crossing with
 * line `i` of the other direction) is filled.
 */
export function liftFog(
  fog: Fog,
  kind: 'row' | 'col',
  index: number,
  filledAt: (cross: number) => boolean,
): Fog {
  const own = kind === 'row' ? fog.rows : fog.cols;
  const crossing = kind === 'row' ? fog.cols : fog.rows;
  const keptOwn = own.filter((i) => i !== index);
  const keptCrossing = crossing.filter((i) => !filledAt(i));
  return kind === 'row'
    ? { rows: keptOwn, cols: keptCrossing }
    : { rows: keptCrossing, cols: keptOwn };
}
