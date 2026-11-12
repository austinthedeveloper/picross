/**
 * Free play across both boards (#153): one list with a Flat tab and a Cubed tab, sharing
 * their filters. A 15×15 and a 5×5×5 aren't comparable by size, so each board keeps its
 * own list, and the filters say the same thing on both.
 */
import type { GameKind } from '@picross/shared/game/boards';

/** The free-play tabs: the 2D pack and Cubed's. */
export type FreePlayTab = GameKind;

/** Each tab's link. `#/free` opens the last tab used (routes.ts). */
export const freePlayHref = (tab: FreePlayTab): string => `#/free/${tab}`;

/**
 * The size filter. The bands are each board's own: Flat's are its four puzzle sizes,
 * Cubed's its list's sections by the block's longest side.
 */
export type SizeBand = 'any' | 'small' | 'medium' | 'large' | 'huge';

export const SIZE_BANDS: {
  id: Exclude<SizeBand, 'any'>;
  label: string;
  flat: string;
  cubed: string;
}[] = [
  { id: 'small', label: 'Small', flat: '5×5', cubed: 'up to 4' },
  { id: 'medium', label: 'Medium', flat: '10×10', cubed: '5–6' },
  { id: 'large', label: 'Large', flat: '15×15', cubed: '7–8' },
  { id: 'huge', label: 'Huge', flat: '20×20 and up', cubed: '9 and up' },
];

/** A 2D puzzle's size band, by its width (the pack's puzzles are square: 5, 10, 15, 20). */
export function flatSizeBand(width: number): Exclude<SizeBand, 'any'> {
  return width <= 5 ? 'small' : width <= 10 ? 'medium' : width <= 15 ? 'large' : 'huge';
}

/**
 * A puzzle Next unsolved or Surprise me could open: its link, and its difficulty band as a
 * number (0 for easy; both boards' five bands line up).
 */
export interface Candidate {
  href: string;
  band: number;
}

/**
 * Next unsolved from both boards: the easier of each tab's next puzzle, and this tab's
 * when they're as hard as each other.
 */
export function nextOfBoth(here: Candidate | null, there: Candidate | null): Candidate | null {
  if (!here || !there) return here ?? there;
  return there.band < here.band ? there : here;
}

/** Any one of the unsolved puzzles on both boards, each as likely as any other. */
export function surpriseOfBoth(
  here: readonly Candidate[],
  there: readonly Candidate[],
  rand: () => number = Math.random,
): Candidate | null {
  const all = [...here, ...there];
  return all.length ? all[Math.floor(rand() * all.length)] : null;
}
