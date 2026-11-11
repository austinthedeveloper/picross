import type { Solution } from '@picross/grid/engine/board';

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
  | { kind: 'streak'; days: number }
  /**
   * Reach a count the saves show (#157): three steps for bronze, silver and gold, or one
   * step for a badge without tiers.
   */
  | { kind: 'count'; count: Count; steps: readonly [number] | readonly [number, number, number] };

/**
 * What a count badge counts. `game/badges.ts` works each one out from the saves, so
 * progress from before a badge existed counts too.
 */
export type Count =
  /** Flat free-play puzzles solved (the pack, not murals). */
  | 'flat-solved'
  /** Flat free-play puzzles of 20×20 or bigger solved. */
  | 'flat-big'
  /** Murals with every tile solved. */
  | 'murals'
  /** Cubed free-play puzzles solved (the pack, not dioramas). */
  | 'cubed-solved'
  /** Blocks solved at least once without a hint, dioramas included. */
  | 'cubed-clean'
  /** The longest side of the biggest Cubed free-play block solved. */
  | 'cubed-biggest'
  /** Diorama pieces solved. */
  | 'diorama-pieces'
  /** Cubed editor play-tests solved. */
  | 'playtests'
  /** The best daily streak, both boards' days together. */
  | 'best-streak'
  /** Chapters with every job won. */
  | 'chapters'
  /** Hits-on wins, every job's added up. */
  | 'hits-on-wins'
  /** Overtime runs and boss fights won. */
  | 'overtime-wins'
  /** The fewer of the two boards' free-play solves. */
  | 'both-solved'
  /** Jobs won on both boards. */
  | 'jobs-on-both'
  /** Pictures in both packs solved on both boards. */
  | 'pictures-on-both';

/**
 * Where a badge sits on the shelf. Job badges go under their chapter; `story` ones follow
 * the chapters.
 */
export type BadgeSection =
  'job' | 'story' | 'flat' | 'cubed' | 'daily' | 'endless' | 'mastery' | 'losses' | 'both';

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

// Free play and both boards (#157). Cubed's badges had emoji before they joined this shelf.

/** A ticked square: a fair deal. */
const SQUARE = [
  '###########',
  '#.........#',
  '#.......#.#',
  '#......##.#',
  '#.....##..#',
  '#.#..##...#',
  '#.####....#',
  '#..##.....#',
  '#.........#',
  '###########',
  '...........',
];

const WALL = [
  '...........',
  '#####.#####',
  '#####.#####',
  '...........',
  '##.#####.##',
  '##.#####.##',
  '...........',
  '#####.#####',
  '#####.#####',
  '...........',
  '...........',
];

/** A framed hill, signed in the corner. */
const SIGNED = [
  '###########',
  '#.........#',
  '#....#....#',
  '#...###...#',
  '#..#####..#',
  '#.........#',
  '#.....#.#.#',
  '#....#.#..#',
  '#.........#',
  '###########',
  '...........',
];

const PICK = [
  '...........',
  '..#######..',
  '.###...###.',
  '.##..#..##.',
  '.#...#...#.',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '.....#.....',
  '....###....',
  '...........',
];

const BULB = [
  '...#####...',
  '..#.....#..',
  '.#.......#.',
  '.#.......#.',
  '.#.......#.',
  '..#.....#..',
  '...#...#...',
  '...#####...',
  '...#####...',
  '....###....',
  '...........',
];

const CUBE = [
  '....#######',
  '...#.....##',
  '..#.....#.#',
  '.#######..#',
  '.#.....#..#',
  '.#.....#..#',
  '.#.....#..#',
  '.#.....#.#.',
  '.#.....##..',
  '.#######...',
  '...........',
];

const LANDSCAPE = [
  '...........',
  '........##.',
  '..#....####',
  '.###....##.',
  '#####......',
  '..#....#...',
  '..#...###..',
  '.....#####.',
  '###########',
  '###########',
  '...........',
];

const BRUSH = [
  '.........##',
  '........###',
  '.......###.',
  '......###..',
  '.....###...',
  '....#.#....',
  '..###......',
  '.####......',
  '.###.......',
  '##.........',
  '...........',
];

const CALENDAR = [
  '..#.....#..',
  '###########',
  '###########',
  '#.........#',
  '#.#.#.#.#.#',
  '#.........#',
  '#.#.#.#.#.#',
  '#.........#',
  '#.#.#.#...#',
  '###########',
  '...........',
];

const NOTEBOOK = [
  '.#########.',
  '##.......#.',
  '.#.#####.#.',
  '##.......#.',
  '.#.#####.#.',
  '##.......#.',
  '.#.####..#.',
  '##.......#.',
  '.#.......#.',
  '.#########.',
  '...........',
];

const HEART = [
  '...........',
  '.###...###.',
  '#####.#####',
  '###########',
  '###########',
  '.#########.',
  '..#######..',
  '...#####...',
  '....###....',
  '.....#.....',
  '...........',
];

/** Half and half. */
const HALVES = [
  '...#####...',
  '.##...####.',
  '.#....####.',
  '#.....#####',
  '#.....#####',
  '#.....#####',
  '#.....#####',
  '#.....#####',
  '.#....####.',
  '.##...####.',
  '...#####...',
];

/** A checklist, ticked twice. */
const CHECKLIST = [
  '...#####...',
  '.####.####.',
  '.#.......#.',
  '.#.##....#.',
  '.#.##.##.#.',
  '.#.......#.',
  '.#.##....#.',
  '.#.##.##.#.',
  '.#.......#.',
  '.#########.',
  '...........',
];

/** A box, unfolded flat. */
const NET = [
  '....####...',
  '....#..#...',
  '....#..#...',
  '.##########',
  '.#..#..#..#',
  '.#..#..#..#',
  '.##########',
  '....#..#...',
  '....#..#...',
  '....####...',
  '...........',
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

/** A badge for reaching a count (#157). */
const count = (
  id: string,
  name: string,
  description: string,
  section: BadgeSection,
  counted: Count,
  steps: readonly [number] | readonly [number, number, number],
  picture: string[],
) =>
  ({
    id,
    name,
    description,
    section,
    rule: { kind: 'count', count: counted, steps },
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
  // Free play on each board, and Cubed's badges from before the one shelf (#157). Cubed's
  // keep their ids with `block-` in front, and their names, but one: its "Regular" is
  // "Clocking In", since the 2D game has a Regular too.
  count(
    'flat-solver',
    'Square Deal',
    'Free-play puzzles solved on the Flat board.',
    'flat',
    'flat-solved',
    [25, 100, 250],
    SQUARE,
  ),
  count('flat-big', 'Wall to Wall', '20×20 puzzles solved.', 'flat', 'flat-big', [1, 10, 40], WALL),
  count(
    'flat-murals',
    'Signed in the Corner',
    'Murals finished, every tile.',
    'flat',
    'murals',
    [1, 5, 12],
    SIGNED,
  ),
  count(
    'block-solver',
    'Block Breaker',
    'Free-play puzzles solved on the Cubed board.',
    'cubed',
    'cubed-solved',
    [5, 15, 30],
    PICK,
  ),
  count(
    'block-clean',
    'No Peeking',
    'Blocks solved without a hint.',
    'cubed',
    'cubed-clean',
    [3, 10, 25],
    BULB,
  ),
  count(
    'block-big',
    'Big Blocks',
    'Longest side of the biggest block solved.',
    'cubed',
    'cubed-biggest',
    [7, 8, 9],
    CUBE,
  ),
  count(
    'block-diorama',
    'Diorama Maker',
    'Diorama pieces placed.',
    'cubed',
    'diorama-pieces',
    [2, 5, 10],
    LANDSCAPE,
  ),
  count(
    'block-builder',
    'Builder',
    "Play-tests solved in Cubed's editor.",
    'cubed',
    'playtests',
    [1, 3, 10],
    BRUSH,
  ),
  count(
    'block-daily',
    'Clocking In',
    'Best daily streak, in days.',
    'daily',
    'best-streak',
    [3, 7, 30],
    CALENDAR,
  ),
  count(
    'block-story',
    'Odd Jobber',
    'Story chapters cleared.',
    'story',
    'chapters',
    [1, 5, 10],
    NOTEBOOK,
  ),
  count(
    'block-overtime',
    'Overtime',
    'Overtime runs and boss fights won.',
    'story',
    'overtime-wins',
    [1, 3, 8],
    MOON,
  ),
  count(
    'block-hits-on',
    'Hits On',
    'Jobs won with Hits on.',
    'mastery',
    'hits-on-wins',
    [1, 5, 15],
    HEART,
  ),
  // Both boards (#157).
  count(
    'fifty-fifty',
    'Fifty-Fifty',
    'Solve 50 free-play puzzles on each board.',
    'both',
    'both-solved',
    [50],
    HALVES,
  ),
  count(
    'second-opinion',
    'Second Opinion',
    'Jobs won on the Flat board and the Cubed one.',
    'both',
    'jobs-on-both',
    [1, 5, 10],
    CHECKLIST,
  ),
  count(
    'flat-packed',
    'Flat-Packed',
    'Pictures solved both flat and as a block.',
    'both',
    'pictures-on-both',
    [1, 10, 25],
    NET,
  ),
];

const byId = new Map(badges.map((badge) => [badge.id, badge]));

export function getBadge(id: string): Badge | undefined {
  return byId.get(id);
}

/** Whether a badge comes in bronze, silver and gold. */
export const hasTiers = ({ rule }: Badge): boolean =>
  rule.kind === 'job' || (rule.kind === 'count' && rule.steps.length > 1);

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
