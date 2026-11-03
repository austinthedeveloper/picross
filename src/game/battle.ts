import type { GadgetEffect } from '../puzzles/gadgets';

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
  /** Enemy hits still blocked by a patch kit (#28). */
  shield?: number;
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

/** Applies a gadget's effect to the fight. Damage follows chip rules (never below 1 HP). */
export function useGadget(
  state: BattleState,
  effect: GadgetEffect,
): { state: BattleState; dealt: number } {
  if (effect.kind === 'shield') {
    return { state: { ...state, shield: (state.shield ?? 0) + effect.hits }, dealt: 0 };
  }
  const enemyHp = Math.max(1, state.enemyHp - effect.amount);
  return { state: { ...state, enemyHp }, dealt: state.enemyHp - enemyHp };
}

/** An enemy hit lands unless a shield absorbs it. */
export function absorbHit(state: BattleState): { state: BattleState; blocked: boolean } {
  if (!state.shield) return { state, blocked: false };
  return { state: { ...state, shield: state.shield - 1 }, blocked: true };
}
