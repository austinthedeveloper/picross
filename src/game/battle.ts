/** An enemy in a fight encounter (#27). */
export interface Enemy {
  name: string;
  /** Placeholder art until #25: an emoji. */
  sprite: string;
  hp: number;
  /** Run HP lost each time the player fills a wrong cell. */
  attack: number;
}

/** A fight in progress. Saved with the run so a reload resumes it. */
export interface BattleState {
  enemyHp: number;
  /** Lines that have already dealt chip damage ("r3", "c0"), so each counts once. */
  struck: string[];
}

/** Damage per newly completed row or column. */
export const CHIP_DAMAGE = 1;

export const lineKey = (kind: 'row' | 'col', index: number) => `${kind[0]}${index}`;

export function startBattle(enemy: Enemy): BattleState {
  return { enemyHp: enemy.hp, struck: [] };
}

/**
 * Deals chip damage for completed lines that haven't struck yet. Chip damage
 * never drops the enemy below 1 HP: only the finished picture defeats it.
 */
export function chip(state: BattleState, keys: string[]): { state: BattleState; dealt: number } {
  const fresh = [...new Set(keys)].filter((k) => !state.struck.includes(k));
  if (!fresh.length) return { state, dealt: 0 };
  const enemyHp = Math.max(1, state.enemyHp - fresh.length * CHIP_DAMAGE);
  return {
    state: { enemyHp, struck: [...state.struck, ...fresh] },
    dealt: state.enemyHp - enemyHp,
  };
}

/** The finisher: the solved picture deals whatever HP the enemy has left. */
export function finish(state: BattleState): { state: BattleState; dealt: number } {
  return { state: { ...state, enemyHp: 0 }, dealt: state.enemyHp };
}
