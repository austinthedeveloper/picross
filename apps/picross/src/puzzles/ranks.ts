/** A free-play rank (#106) and the points it takes to reach it. */
export interface Rank {
  name: string;
  points: number;
}

/**
 * The ladder, lowest first. Thresholds stay fixed so new puzzles can't lower
 * anyone's rank. The pack and murals totalled 1,868 points when this was set.
 */
export const ranks: Rank[] = [
  { name: 'Hobbyist', points: 0 },
  { name: 'Tinkerer', points: 10 },
  { name: 'Odd-Jobber', points: 30 },
  { name: 'Fixer', points: 75 },
  { name: 'Licensed Fixer', points: 150 },
  { name: 'Specialist', points: 300 },
  { name: 'Expert', points: 500 },
  { name: 'Local Legend', points: 750 },
  { name: 'Regional Legend', points: 1100 },
  { name: 'No Job Too Strange', points: 1500 },
];

export const TILE_POINTS = 3;
export const DAILY_POINTS = 3;

/** What solving a puzzle is worth, by its longer side. Bigger boards are worth far more work. */
export function puzzlePoints(size: number): number {
  if (size <= 5) return 1;
  if (size <= 10) return 2;
  return size <= 15 ? 3 : 6;
}
