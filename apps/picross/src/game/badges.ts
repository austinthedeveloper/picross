import { lineCount } from '@picross/grid/engine/lines';
import { puzzles } from '@picross/grid/puzzles/index';
import { murals } from '@picross/grid/puzzles/murals';
import { blockCatalog } from '@picross/block/puzzles/catalog';
import type { Dimension } from '@picross/shared/puzzles/ids';
import { badges, getBadge, hasTiers, type Badge, type Count, type Tier } from '../puzzles/badges';
import { chapters } from '../puzzles/chapters';
import { ENDLESS_ID } from '../puzzles/endless';
import { bossFights, overtimeRuns, runs } from '../puzzles/runs';
import { currentForm, type Enemy } from './battle';
import { bestDailyStreak } from './daily';
import { badgeLevel } from './legacyMerge';
import { playtests, progressFor } from './progress';
import type { RunState } from './run';
import { getJobStats, jobIds, type JobStats } from './runSave';
import { readStore, writeStore } from '@picross/shared/game/storage';

const KEY = 'picross:badges';

/** A badge you have: its best tier, and when you first earned it, if that's known. */
export interface Earned {
  tier?: Tier;
  /** Milliseconds since 1970. Missing on badges awarded from an older save. */
  at?: number;
}

export interface BadgeSave {
  earned: Record<string, Earned>;
  /**
   * How far each badge had got the last time the shelf was open (`badgeLevel`), so it can
   * mark what's new (#157). Missing on saves from before the one shelf.
   */
  seen?: Record<string, number>;
}

/** Something a player qualifies for, which may or may not be new to them. */
export interface Award {
  id: string;
  tier?: Tier;
}

/** A badge just earned or improved, to show the player. */
export interface NewBadge {
  badge: Badge;
  tier?: Tier;
  upgraded: boolean;
}

const data = readStore<BadgeSave>(KEY, { earned: {} });

const TIERS: Tier[] = ['bronze', 'silver', 'gold'];
/** Untiered is -1, below bronze, so an untiered badge never "upgrades". */
const tierRank = (tier?: Tier) => (tier ? TIERS.indexOf(tier) : -1);

/** The tier a finished job's run earns: any win is bronze; gold needs a clean Hits-on run. */
export function runTier(run: RunState): Tier | null {
  if (run.status !== 'won') return null;
  if (run.mode !== 'hearts') return 'bronze';
  // A bomb reveals cells like a hint does (#115). A run with no tally can't prove it was clean.
  const clean = run.tally && !run.tally.wrongFills && !run.tally.hintsUsed && !run.tally.bombsUsed;
  return clean ? 'gold' : 'silver';
}

/** What finishing this run earns on its own, beyond what the job stats show. */
export function runAwards(run: RunState): Award[] {
  if (run.endless) return [];
  const tier = runTier(run);
  if (!tier) return [];
  return badges.flatMap(({ id, rule }): Award[] => {
    if (rule.kind === 'job' && rule.job === run.runId) return [{ id, tier }];
    const noGadgets = run.mode === 'hearts' && run.tally && !run.tally.gadgetsUsed;
    return rule.kind === 'no-gadgets' && noGadgets ? [{ id }] : [];
  });
}

/**
 * What beating this fight earns (#110). Call it before the encounter is cleared,
 * while the battle is still on the run. Hits-on only, and never for a run that
 * started before the counts existed, since its earlier mistakes went uncounted.
 */
export function fightAwards(run: RunState, encounterId: string, enemy: Enemy): Award[] {
  const { battle } = run;
  if (!battle || !run.tally || run.mode !== 'hearts') return [];
  const counts = battle.counts ?? {};
  return badges.flatMap(({ id, rule }): Award[] => {
    switch (rule.kind) {
      case 'no-zaps':
        // A charge that never started is nothing to be proud of beating.
        return currentForm(enemy, battle).charge && !counts.zaps ? [{ id }] : [];
      case 'no-false-accusations': {
        const allCaught = enemy.fakes && !lineCount(battle.fakes ?? { rows: [], cols: [] });
        return allCaught && !counts.wrongAccusations ? [{ id }] : [];
      }
      case 'no-sponge':
        return rule.encounter === encounterId && !counts.spongesUsed ? [{ id }] : [];
      default:
        return [];
    }
  });
}

/** What the saved stats prove, which also covers progress from before badges existed. */
export function statsAwards(job: (id: string) => JobStats | undefined, dailyBest: number): Award[] {
  return badges.flatMap(({ id, rule }): Award[] => {
    switch (rule.kind) {
      case 'job': {
        const stats = job(rule.job);
        if (stats?.hitsOnWins) return [{ id, tier: 'silver' }];
        return stats?.wins ? [{ id, tier: 'bronze' }] : [];
      }
      case 'loss': {
        const stats = job(rule.job);
        return stats && stats.plays > stats.wins ? [{ id }] : [];
      }
      case 'depth':
        return (job(ENDLESS_ID)?.bestDepth ?? 0) >= rule.depth ? [{ id }] : [];
      case 'streak':
        return dailyBest >= rule.days ? [{ id }] : [];
      default:
        return [];
    }
  });
}

/** What the counts come from (#157): both boards' saves. */
export interface Facts {
  job(id: string): JobStats | undefined;
  /** Every job with stats. */
  jobIds: readonly string[];
  dailyBest: number;
  /** Free-play ids solved on each board, bare: pack puzzles, mural tiles, diorama pieces. */
  solved: Record<Dimension, readonly string[]>;
  /** Blocks solved without a hint at least once. */
  cleanBlocks: number;
  playtests: number;
}

const flatPack = new Map(puzzles.map((p) => [p.id, Math.max(p.width, p.height)]));
const blockPack = blockCatalog.puzzles;
/** Every job, Overtime runs and boss fights too. Endless isn't one: nobody wins it. */
const ALL_JOBS = [...runs, ...overtimeRuns, ...bossFights];
const EXTRA_JOBS = [...overtimeRuns, ...bossFights];
const won = (stats?: JobStats) => (stats?.wins ?? 0) > 0;

/** One count, from the saves. */
export function countOf(count: Count, facts: Facts): number {
  const flat = facts.solved.grid.filter((id) => flatPack.has(id));
  const block = facts.solved.block.filter((id) => id in blockPack);
  switch (count) {
    case 'flat-solved':
      return flat.length;
    case 'flat-big':
      return flat.filter((id) => flatPack.get(id)! >= 20).length;
    case 'murals': {
      const solved = new Set(facts.solved.grid);
      return murals.filter((m) => m.tiles.every((t) => solved.has(t.id))).length;
    }
    case 'cubed-solved':
      return block.length;
    case 'cubed-clean':
      return facts.cleanBlocks;
    case 'cubed-biggest':
      return Math.max(0, ...block.map((id) => blockPack[id]));
    case 'diorama-pieces': {
      const solved = new Set(facts.solved.block);
      return blockCatalog.dioramaTiles.filter((id) => solved.has(id)).length;
    }
    case 'playtests':
      return facts.playtests;
    case 'best-streak':
      return facts.dailyBest;
    case 'chapters':
      return chapters.filter((c) => c.jobs.every((j) => won(facts.job(j.id)))).length;
    case 'hits-on-wins':
      return ALL_JOBS.reduce((n, j) => n + (facts.job(j.id)?.hitsOnWins ?? 0), 0);
    case 'overtime-wins':
      return EXTRA_JOBS.filter((j) => won(facts.job(j.id))).length;
    case 'both-solved':
      return Math.min(flat.length, block.length);
    case 'jobs-on-both':
      return facts.jobIds.filter((id) => {
        const on = facts.job(id)?.wonOn ?? [];
        return id !== ENDLESS_ID && on.includes('grid') && on.includes('block');
      }).length;
    case 'pictures-on-both': {
      const solved = new Set(block);
      return flat.filter((id) => solved.has(id)).length;
    }
  }
}

/** The award a count badge's count reaches, if any. */
export function countAward(badge: Badge, value: number): Award | null {
  if (badge.rule.kind !== 'count') return null;
  const { steps } = badge.rule;
  const reached = steps.filter((step) => value >= step).length;
  if (!reached) return null;
  return steps.length > 1 ? { id: badge.id, tier: TIERS[reached - 1] } : { id: badge.id };
}

/** What the counts earn. */
export const countAwards = (facts: Facts): Award[] =>
  badges.flatMap((badge) =>
    badge.rule.kind === 'count' ? (countAward(badge, countOf(badge.rule.count, facts)) ?? []) : [],
  );

/** Both boards' saves as they are now. */
function currentFacts(): Facts {
  const block = progressFor('block');
  return {
    job: getJobStats,
    jobIds: jobIds(),
    dailyBest: bestDailyStreak(),
    solved: { grid: progressFor('grid').solvedIds(), block: block.solvedIds() },
    cleanBlocks: block.cleanSolves(),
    playtests: playtests(),
  };
}

/** A count badge's count right now, for the shelf. */
export const currentCount = (count: Count): number => countOf(count, currentFacts());

/**
 * Saves awards that are new or better than what's saved. Tiers only go up: an award below
 * what's saved changes nothing, so nobody ever loses a badge or a tier. Returns those.
 */
export function earn(awards: readonly Award[], at?: number): NewBadge[] {
  const fresh: NewBadge[] = [];
  for (const { id, tier } of awards) {
    const badge = getBadge(id);
    const prev = data.earned[id];
    if (!badge || (prev && tierRank(tier) <= tierRank(prev.tier))) continue;
    const date = prev ? prev.at : at;
    data.earned[id] = { ...(tier ? { tier } : {}), ...(date ? { at: date } : {}) };
    fresh.push({ badge, ...(tier ? { tier } : {}), upgraded: Boolean(prev) });
  }
  if (fresh.length) writeStore(KEY, data);
  return fresh;
}

const fromStats = () => {
  const facts = currentFacts();
  return [...statsAwards(facts.job, facts.dailyBest), ...countAwards(facts)];
};

/**
 * Awards what the saves have already earned, without dates: at startup, for older saves and
 * the other board's progress, and when the shelf opens.
 */
export function syncBadges(): void {
  earn(fromStats());
}

/**
 * Badges from saved stats that have just changed, like a new daily streak (#111) or a
 * solve on either board (#157).
 */
export const earnFromStats = (): NewBadge[] => earn(fromStats(), Date.now());

/** Badges for a run that's over. Call after its result is recorded, on the first look only. */
export function earnFromRun(run: RunState): NewBadge[] {
  const now = Date.now();
  return [...earn(runAwards(run), now), ...earn(fromStats(), now)];
}

/** Badges for a fight just won. */
export const earnFromFight = (run: RunState, encounterId: string, enemy: Enemy): NewBadge[] =>
  earn(fightAwards(run, encounterId, enemy), Date.now());

export const getEarned = (id: string): Earned | undefined => data.earned[id];

export function badgeCount() {
  return {
    earned: badges.filter((b) => data.earned[b.id]).length,
    total: badges.length,
  };
}

/** Whether a badge has been earned, or gone up a tier, since the shelf was last open. */
export const isNew = (id: string): boolean => badgeLevel(data.earned[id]) > (data.seen?.[id] ?? 0);

/** How many badges are new since the shelf was last open. */
export const newBadgeCount = (): number => badges.filter((b) => isNew(b.id)).length;

/** The shelf is open: everything on it has been seen. */
export function markBadgesSeen(): void {
  if (!newBadgeCount()) return;
  const seen = { ...data.seen };
  for (const b of badges) if (data.earned[b.id]) seen[b.id] = badgeLevel(data.earned[b.id]);
  data.seen = seen;
  writeStore(KEY, data);
}

/** A tier in words: "Silver". */
export const tierLabel = (tier: Tier) => tier[0].toUpperCase() + tier.slice(1);

/** One badge's line: "Badge earned: Invoiced a Bat (Silver)!" */
export function newBadgeLine({ badge, tier, upgraded }: NewBadge): string {
  const label = tier ? ` (${tierLabel(tier)})` : '';
  return `Badge ${upgraded ? 'upgraded' : 'earned'}: ${badge.name}${label}!`;
}

/** The lines for a solved screen, or '' if nothing was earned. */
export const badgeNote = (fresh: readonly NewBadge[]) => fresh.map(newBadgeLine).join(' ');

/** What a count badge's next tier needs, or that it's all done: "Silver at 15 (5 so far)". */
export function nextStep(badge: Badge, value: number): string {
  if (badge.rule.kind !== 'count') return '';
  const { steps } = badge.rule;
  const next = steps.find((step) => value < step);
  if (next === undefined) return hasTiers(badge) ? 'All tiers earned' : 'Done';
  if (!hasTiers(badge)) return `${value} of ${next} so far`;
  return `${tierLabel(TIERS[steps.indexOf(next)])} at ${next} (${value} so far)`;
}

/** What to do next with a job's badge, for the shelf and the job card. */
export function nextTierHint(earned?: Earned): string {
  switch (earned?.tier) {
    case 'gold':
      return 'Top tier.';
    case 'silver':
      return 'Gold: clear it with Hits on, no wrong fills, no hints and no bombs.';
    case 'bronze':
      return 'Silver: clear it with Hits on.';
    default:
      return 'Bronze: clear it in any mode.';
  }
}
