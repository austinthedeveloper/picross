import { lineCount } from '../engine/lines';
import { badges, getBadge, type Badge, type Tier } from '../puzzles/badges';
import { ENDLESS_ID } from '../puzzles/endless';
import { currentForm, type Enemy } from './battle';
import { bestDailyStreak } from './daily';
import type { RunState } from './run';
import { getJobStats, type JobStats } from './runSave';
import { readStore, writeStore } from './storage';

const KEY = 'picross:badges';

/** A badge you have: its best tier, and when you first earned it, if that's known. */
export interface Earned {
  tier?: Tier;
  /** Milliseconds since 1970. Missing on badges awarded from an older save. */
  at?: number;
}

export interface BadgeSave {
  earned: Record<string, Earned>;
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

/** Saves awards that are new or better than what's saved. Tiers only go up. Returns those. */
function earn(awards: readonly Award[], at?: number): NewBadge[] {
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

const fromStats = () => statsAwards(getJobStats, bestDailyStreak());

/** Awards what older saves have already earned, without dates. Run once at startup. */
export function syncBadges(): void {
  earn(fromStats());
}

/** Badges from saved stats that have just changed, like a new daily streak (#111). */
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

/** A tier in words: "Silver". */
export const tierLabel = (tier: Tier) => tier[0].toUpperCase() + tier.slice(1);

/** One badge's line: "Badge earned: Invoiced a Bat (Silver)!" */
export function newBadgeLine({ badge, tier, upgraded }: NewBadge): string {
  const label = tier ? ` (${tierLabel(tier)})` : '';
  return `Badge ${upgraded ? 'upgraded' : 'earned'}: ${badge.name}${label}!`;
}

/** The lines for a solved screen, or '' if nothing was earned. */
export const badgeNote = (fresh: readonly NewBadge[]) => fresh.map(newBadgeLine).join(' ');

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
