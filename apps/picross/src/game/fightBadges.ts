/**
 * The badges a fight earns (#110). Apart from `badges.ts` because it reads the fight's
 * battle, which brings the fight engine: only the run's fight screens use it, so the
 * engine stays out of the first download (`npm run check:budget`).
 */
import { lineCount } from '@picross/grid/engine/lines';
import { badges } from '../puzzles/badges';
import { earn, type Award, type NewBadge } from './badges';
import { currentForm, type Enemy } from './battle';
import type { RunState } from './run';

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

/** Badges for a fight just won. */
export const earnFromFight = (run: RunState, encounterId: string, enemy: Enemy): NewBadge[] =>
  earn(fightAwards(run, encounterId, enemy), Date.now());
