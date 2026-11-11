import type { Solution } from '../engine/board';

/** How well you cleared a job (#108). */
export type Tier = 'bronze' | 'silver' | 'gold';

/** What earns a badge. `game/badges.ts` holds the rules; this is only what they apply to. */
export type BadgeRule =
  /** Clear this job. Comes in tiers. */
  | { kind: 'job'; job: string }
  /** Lose a run of this job, in any mode. */
  | { kind: 'loss'; job: string }
  /** With Hits on, beat an enemy whose charge started without being zapped. */
  | { kind: 'no-zaps' }
  /** With Hits on, call out every forged clue with no wrong accusations. */
  | { kind: 'no-false-accusations' }
  /** With Hits on, beat this encounter without using a sponge. */
  | { kind: 'no-sponge'; encounter: string }
  /** With Hits on, clear any job without using a gadget. */
  | { kind: 'no-gadgets' }
  /** Reach this depth in Endless. */
  | { kind: 'depth'; depth: number }
  /** Reach this daily streak. */
  | { kind: 'streak'; days: number };

/** Where a badge sits on the shelf. Job badges go under their chapter. */
export type BadgeSection = 'job' | 'mastery' | 'losses' | 'endless' | 'daily';

export interface Badge {
  id: string;
  name: string;
  /** How to earn it, shown on the shelf. */
  description: string;
  section: BadgeSection;
  rule: BadgeRule;
  /**
   * Stays "???" on the shelf until this job is open, so its name can't spoil the
   * story. Without it, the badge shows from the start.
   */
  opensWith?: string;
  /** Rows of a pixel picture, `#` for filled. */
  picture: string[];
}

const BAT = [
  '...........',
  '...........',
  '#..#...#..#',
  '##.#####.##',
  '###.###.###',
  '###########',
  '###########',
  '.##.###.##.',
  '.#...#...#.',
  '...........',
  '...........',
];

const MOON = [
  '....####...',
  '..###......',
  '.###.......',
  '.##........',
  '###........',
  '###........',
  '###.......#',
  '.###.....##',
  '.#####.####',
  '..########.',
  '....####...',
];

const OCTOPUS = [
  '...#####...',
  '..#######..',
  '.#########.',
  '.##.###.##.',
  '.##.###.##.',
  '.#########.',
  '..#######..',
  '.#########.',
  '#.#.#.#.#.#',
  '#.#.#.#.#.#',
  '#...#.#...#',
];

const ROSE = [
  '...##.##...',
  '..#######..',
  '..###.###..',
  '..#######..',
  '...#####...',
  '.....#.....',
  '.##..#.....',
  '..##.#.##..',
  '...###.#...',
  '.....###...',
  '.....#.....',
];

const TICKET = [
  '...........',
  '...........',
  '###########',
  '###.#######',
  '######...##',
  '.##.######.',
  '.#########.',
  '###.##...##',
  '###########',
  '###.#######',
  '...........',
];

const TOWEL = [
  '...........',
  '###########',
  '..#######..',
  '..#######..',
  '..#.....#..',
  '..#######..',
  '..#######..',
  '..#######..',
  '..#.#.#.#..',
  '..#.#.#.#..',
  '...........',
];

const FORM = [
  '...#####...',
  '.#########.',
  '.#.......#.',
  '.#.#####.#.',
  '.#.......#.',
  '.#.#####.#.',
  '.#.......#.',
  '.#.###...#.',
  '.#.......#.',
  '.#########.',
  '...........',
];

/** A coin with a bite out of it. Mostly chocolate. */
const COIN = [
  '...####....',
  '.#######...',
  '.###.###...',
  '###...####.',
  '###...#####',
  '####.######',
  '###########',
  '###########',
  '.#########.',
  '.#########.',
  '...#####...',
];

const PIN = [
  '...#####...',
  '..#######..',
  '.###...###.',
  '.##.....##.',
  '.###...###.',
  '..#######..',
  '..#######..',
  '...#####...',
  '....###....',
  '.....#.....',
  '...........',
];

const KEY = [
  '...........',
  '...........',
  '...........',
  '.###.......',
  '#...#......',
  '#...#######',
  '#...#...#.#',
  '.###....#.#',
  '...........',
  '...........',
  '...........',
];

const BOLT = [
  '......##...',
  '.....##....',
  '....##.....',
  '...####....',
  '..#######..',
  '.....##....',
  '....##.....',
  '...##......',
  '..##.......',
  '..#........',
  '...........',
];

const GLASS = [
  '...####....',
  '..#....#...',
  '.#......#..',
  '.#......#..',
  '.#......#..',
  '.#......#..',
  '..#....#...',
  '...####.#..',
  '.........#.',
  '..........#',
  '...........',
];

const SPONGE = [
  '...........',
  '...........',
  '.#########.',
  '###.####.##',
  '######.####',
  '#.#####.###',
  '####.######',
  '###########',
  '.#########.',
  '...........',
  '...........',
];

const TOOLBOX = [
  '...........',
  '...#####...',
  '...#...#...',
  '###########',
  '###########',
  '###########',
  '#####.#####',
  '###########',
  '###########',
  '###########',
  '...........',
];

const TAG = [
  '.....#.....',
  '....#.#....',
  '...#...#...',
  '..#######..',
  '..#.....#..',
  '..#.###.#..',
  '..#.....#..',
  '..#.###.#..',
  '..#.....#..',
  '..#######..',
  '...........',
];

const SHEARS = [
  '#.........#',
  '.#.......#.',
  '..#.....#..',
  '...#...#...',
  '....#.#....',
  '.....#.....',
  '....#.#....',
  '..##...##..',
  '.#..#.#..#.',
  '.#..#.#..#.',
  '..##...##..',
];

const FINE = [
  '...........',
  '###########',
  '#.........#',
  '#..#...#..#',
  '#...#.#...#',
  '#....#....#',
  '#...#.#...#',
  '#..#...#..#',
  '#.........#',
  '###########',
  '...........',
];

const ANCHOR = [
  '.....#.....',
  '....#.#....',
  '.....#.....',
  '...#####...',
  '.....#.....',
  '.....#.....',
  '#....#....#',
  '##...#...##',
  '.##..#..##.',
  '..#######..',
  '....###....',
];

const FLAME = [
  '.....#.....',
  '.....##....',
  '....###....',
  '...####.#..',
  '.#.######..',
  '.#########.',
  '.####.####.',
  '.###...###.',
  '.###...###.',
  '..##...##..',
  '...#####...',
];

/** Each job's badge, named after a line from that job's script. */
const jobBadge = (id: string, job: string, jobName: string, name: string, picture: string[]) =>
  ({
    id,
    name,
    description: `Clear ${jobName}.`,
    section: 'job',
    rule: { kind: 'job', job },
    opensWith: job,
    picture,
  }) satisfies Badge;

export const badges: Badge[] = [
  jobBadge('invoiced-a-bat', 'first-job', 'First Job', 'Invoiced a Bat', BAT),
  jobBadge('double-rates', 'night-shift', 'The Night Shift', 'Double Rates', MOON),
  jobBadge('octopus-diplomacy', 'deep-end', 'The Deep End', 'Octopus Diplomacy', OCTOPUS),
  jobBadge('plant-whisperer', 'glasshouse', 'The Glasshouse', 'Plant Whisperer', ROSE),
  jobBadge('no-refunds', 'midway', 'The Midway', 'No Refunds', TICKET),
  jobBadge('towels', 'summit-station', 'Summit Station', 'The Towels Were Useful', TOWEL),
  jobBadge('filled-in-the-form', 'night-mail', 'The Night Mail', 'Filled In the Form', FORM),
  jobBadge('chocolate-coins', 'undercroft', 'The Undercroft', 'Mostly Chocolate Coins', COIN),
  jobBadge('back-on-the-map', 'the-annex', 'The Annex', 'Back on the Map', PIN),
  jobBadge('invoice-paid', 'closing-time', 'Closing Time', 'Invoice Paid', KEY),
  {
    id: 'grounded',
    name: 'Grounded',
    description: 'With Hits on, beat an enemy with a charge without being zapped.',
    section: 'mastery',
    rule: { kind: 'no-zaps' },
    opensWith: 'deep-end',
    picture: BOLT,
  },
  {
    id: 'expert-witness',
    name: 'Expert Witness',
    description: 'With Hits on, call out every forged clue in a fight with no wrong accusations.',
    section: 'mastery',
    rule: { kind: 'no-false-accusations' },
    opensWith: 'night-shift',
    picture: GLASS,
  },
  {
    id: 'no-sponge-required',
    name: 'No Sponge Required',
    description: 'With Hits on, beat Old Tess without using a sponge.',
    section: 'mastery',
    rule: { kind: 'no-sponge', encounter: 'old-tess' },
    opensWith: 'deep-end',
    picture: SPONGE,
  },
  {
    id: 'toolbox-shut',
    name: 'Toolbox Shut',
    description: 'With Hits on, clear a job without using a gadget.',
    section: 'mastery',
    rule: { kind: 'no-gadgets' },
    picture: TOOLBOX,
  },
  {
    id: 'exhibit-41',
    name: 'Exhibit 41: Unpaid',
    description: 'Lose a run of Closing Time.',
    section: 'losses',
    rule: { kind: 'loss', job: 'closing-time' },
    opensWith: 'closing-time',
    picture: TAG,
  },
  {
    id: 'pruned',
    name: 'Pruned',
    description: 'Lose a run of The Glasshouse.',
    section: 'losses',
    rule: { kind: 'loss', job: 'glasshouse' },
    opensWith: 'glasshouse',
    picture: SHEARS,
  },
  {
    id: 'fined',
    name: 'Fined for Traveling Without a Ticket',
    description: 'Lose a run of The Night Mail.',
    section: 'losses',
    rule: { kind: 'loss', job: 'night-mail' },
    opensWith: 'night-mail',
    picture: FINE,
  },
  {
    id: 'going-down',
    name: 'Going Down',
    description: 'Reach depth 5 in Endless.',
    section: 'endless',
    rule: { kind: 'depth', depth: 5 },
    opensWith: 'night-shift',
    picture: ANCHOR,
  },
  {
    id: 'deep-cover',
    name: 'Deep Cover',
    description: 'Reach depth 10 in Endless.',
    section: 'endless',
    rule: { kind: 'depth', depth: 10 },
    opensWith: 'night-shift',
    picture: ANCHOR,
  },
  {
    id: 'rock-bottom',
    name: 'Rock Bottom',
    description: 'Reach depth 20 in Endless.',
    section: 'endless',
    rule: { kind: 'depth', depth: 20 },
    opensWith: 'night-shift',
    picture: ANCHOR,
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Solve the daily 7 days in a row.',
    section: 'daily',
    rule: { kind: 'streak', days: 7 },
    picture: FLAME,
  },
  {
    id: 'creature-of-habit',
    name: 'Creature of Habit',
    description: 'Solve the daily 30 days in a row.',
    section: 'daily',
    rule: { kind: 'streak', days: 30 },
    picture: FLAME,
  },
  {
    id: 'part-of-the-furniture',
    name: 'Part of the Furniture',
    description: 'Solve the daily 100 days in a row.',
    section: 'daily',
    rule: { kind: 'streak', days: 100 },
    picture: FLAME,
  },
];

const byId = new Map(badges.map((badge) => [badge.id, badge]));

export function getBadge(id: string): Badge | undefined {
  return byId.get(id);
}

/** A job's badge, if it has one. */
export function jobBadgeFor(job: string): Badge | undefined {
  return badges.find((b) => b.rule.kind === 'job' && b.rule.job === job);
}

/** A badge's picture, ready to draw. */
export function pictureOf(badge: Badge): Solution {
  return {
    width: badge.picture[0].length,
    height: badge.picture.length,
    cells: [...badge.picture.join('')].map((c) => c === '#'),
  };
}
