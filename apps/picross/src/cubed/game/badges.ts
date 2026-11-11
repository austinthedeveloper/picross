import { dioramaTileIds } from '@picross/block/puzzles/dioramas';
import { PUZZLES } from '@picross/block/puzzles/index';
import { chapters, jobs } from '@picross/block/story/data';
import { bestStreak } from './daily';
import { cleanSolves, playtests, solvedIds } from './progress';
import { clearedJobs, getJobStats } from './runSave';
import { readStore, writeStore } from '@picross/shared/game/storage';

export const TIERS = ['Bronze', 'Silver', 'Gold'] as const;

export interface Badge {
  id: string;
  name: string;
  icon: string;
  /** What counts, said plainly. */
  how: string;
  /** What it takes for bronze, silver and gold. */
  steps: [number, number, number];
  /** Where you are now. */
  value(): number;
}

const longest = (id: string) => {
  const p = PUZZLES.find((q) => q.id === id);
  return p ? Math.max(p.dims.x, p.dims.y, p.dims.z) : 0;
};

/**
 * The badges, each worked out from the saves, so progress made before badges existed
 * counts too. Every tier also has a text label, so color is never the only signal.
 */
export const BADGES: Badge[] = [
  {
    id: 'solver',
    name: 'Block Breaker',
    icon: '⛏',
    how: 'Free-play puzzles solved',
    steps: [5, 15, 30],
    value: () => solvedIds().filter((id) => PUZZLES.some((p) => p.id === id)).length,
  },
  {
    id: 'clean',
    name: 'No Peeking',
    icon: '💡',
    how: 'Puzzles solved without a hint',
    steps: [3, 10, 25],
    value: cleanSolves,
  },
  {
    id: 'big',
    name: 'Big Blocks',
    icon: '🧊',
    how: 'Longest side of the biggest block solved',
    steps: [7, 8, 9],
    value: () => Math.max(0, ...solvedIds().map(longest)),
  },
  {
    id: 'daily',
    name: 'Regular',
    icon: '📅',
    how: 'Best daily streak, in days',
    steps: [3, 7, 30],
    value: bestStreak,
  },
  {
    id: 'story',
    name: 'Odd Jobber',
    icon: '📒',
    how: 'Story chapters cleared',
    steps: [1, 5, 10],
    value: () => {
      const done = new Set(clearedJobs());
      return chapters.filter((c) => c.jobs.every((j) => done.has(j.id))).length;
    },
  },
  {
    id: 'hits-on',
    name: 'Hits On',
    icon: '♥',
    how: 'Jobs won with Hits on',
    steps: [1, 5, 15],
    value: () => jobs.reduce((n, j) => n + (getJobStats(j.id)?.hitsOnWins ?? 0), 0),
  },
  {
    id: 'overtime',
    name: 'Overtime',
    icon: '🌙',
    how: 'Overtime runs and boss fights won',
    steps: [1, 3, 8],
    value: () =>
      jobs.filter((j) => (j.overtimeOf || j.bossOf) && (getJobStats(j.id)?.wins ?? 0) > 0).length,
  },
  {
    id: 'builder',
    name: 'Builder',
    icon: '🖌',
    how: 'Editor play-tests solved',
    steps: [1, 3, 10],
    value: playtests,
  },
  {
    id: 'diorama',
    name: 'Diorama Maker',
    icon: '🏞',
    how: 'Diorama pieces placed',
    steps: [2, 5, 10],
    value: () => {
      const solved = new Set(solvedIds());
      return dioramaTileIds().filter((id) => solved.has(id)).length;
    },
  },
];

/** The best tier reached (0 bronze, 1 silver, 2 gold), or -1. */
export function tierOf(badge: Badge, value = badge.value()): number {
  return badge.steps.reduce((t, step, i) => (value >= step ? i : t), -1);
}

/** What the next tier needs, or that it's all done. */
export function nextStep(badge: Badge, value = badge.value()): string {
  const t = tierOf(badge, value);
  if (t >= 2) return 'All tiers earned';
  return `${TIERS[t + 1]} at ${badge.steps[t + 1]} (${value} so far)`;
}

const KEY = 'picross3d:badges';
const seen = readStore<{ tiers: Record<string, number> }>(KEY, { tiers: {} });

/** Badges whose tier has gone up since the badges screen was last opened. */
export const newBadges = () => BADGES.filter((b) => tierOf(b) > (seen.tiers[b.id] ?? -1));

export function markBadgesSeen(): void {
  for (const b of BADGES) seen.tiers[b.id] = tierOf(b);
  writeStore(KEY, seen);
}
