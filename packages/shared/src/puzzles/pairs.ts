/**
 * The insane pairs: subjects made on both boards, a Flat puzzle and a Cubed one with the same
 * id (so solving both counts toward the both-boards badge), both at Insane. Pets and
 * instruments, the first set.
 *
 * They're free play's, not the daily's: a daily should be fair game for anyone, and a puzzle
 * joining a daily's pool reshuffles that daily's whole cycle (every day's puzzle moves), so
 * both dailies leave these out (`apps/picross/src/puzzles/daily.ts`,
 * `packages/block/src/puzzles/daily.ts`).
 */
export const INSANE_PAIRS: readonly string[] = [
  'goldfish-bowl',
  'tortoise',
  'hamster',
  'kitten',
  'violin',
  'drum-kit',
  'trumpet',
  'harp',
];

export const isInsanePair = (id: string): boolean => INSANE_PAIRS.includes(id);
