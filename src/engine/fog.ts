/**
 * Clues hidden by fog (#30): row or column indexes. Fog covers one direction
 * only: a fogged row and a fogged column would hide the cell where they cross
 * from both of its lines, so neither could ever be completed.
 */
export interface Fog {
  rows: number[];
  cols: number[];
}

export const noFog = (): Fog => ({ rows: [], cols: [] });

export const isFogged = (fog: Fog, kind: 'row' | 'col', index: number) =>
  (kind === 'row' ? fog.rows : fog.cols).includes(index);

/**
 * The fog left after a line is completed. Fog only lifts from the line you
 * complete, so a fogged line has to be solved from its crossing lines; its
 * clue appears as the reward.
 */
export function liftFog(fog: Fog, kind: 'row' | 'col', index: number): Fog {
  return kind === 'row'
    ? { rows: fog.rows.filter((i) => i !== index), cols: fog.cols }
    : { rows: fog.rows, cols: fog.cols.filter((i) => i !== index) };
}
