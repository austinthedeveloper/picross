import { describe, expect, it } from 'vitest';
import { Battle } from '@picross/block/game/battle';
import { hashString } from '@picross/block/puzzles/hide';
import { getEncounter as getBlockEncounter } from '@picross/block/story/data';
import { boardAt, switchesBoard } from '@picross/story/fight/switch';
import { getEncounter, runs } from '../puzzles/runs';
import {
  advancePhase,
  enterFlat,
  handOver,
  startBattle,
  takeCounts,
  type BattleState,
  type Phase,
} from './battle';

/** A boss that unfolds into a block at 60% and folds back flat at 30% (like the Curator). */
const phases: Phase[] = [
  { at: 0.9, taunt: 'Warming up.' },
  { at: 0.6, board: 'block' },
  { at: 0.45, taunt: 'Still a block.' },
  { at: 0.3, board: 'flat' },
];
const boss = { name: 'Folding Boss', sprite: 'curator', hp: 60, attack: 2, phases };

const curator = getEncounter('curator')!.enemy!;
const blockCurator = getBlockEncounter('curator')!;
const blank = () => new Uint8Array(blockCurator.puzzle.solution.length);
const newBlock = () =>
  new Battle(blockCurator.enemy!, blockCurator.puzzle, true, undefined, {
    seed: hashString('curator'),
  });

/** The Curator's flat battle once its HP has fallen to `share`, its phases started. */
function flatAt(share: number, more: Partial<BattleState> = {}) {
  const battle = { ...startBattle(curator), enemyHp: Math.floor(share * curator.hp), ...more };
  return advancePhase(curator, battle, 20).state;
}

describe('a boss that switches board: one fight on two boards (#170)', () => {
  it('back on the flat board, the phases from the block start there', () => {
    const left = { ...startBattle(boss), phase: 2, enemyHp: 35 };
    const block = {
      enemyHp: 29,
      maxHp: 100,
      phase: 3,
      shield: 0,
      counts: handOver(boss, left).counts,
    };
    const { state, entered } = enterFlat(boss, left, block);
    expect(entered.map((p) => p.at)).toEqual([0.45, 0.3]);
    expect(state.enemyHp).toBe(18);
    expect(boardAt(boss, state.phase)).toBe('flat');
  });

  it('the Curator unfolds at 60%: the block takes its HP share, phases, patch kit and counts', () => {
    const flat = flatAt(0.59, { shield: 1, counts: { wrongFills: 2, zaps: 1, bombsUsed: 1 } });
    expect(flat.phase).toBe(4);
    expect(boardAt(curator, flat.phase)).toBe('block');

    const block = newBlock();
    const events = block.enterBoard(handOver(curator, flat), blank());
    // The same phases started, with the block's own picks for their powers.
    expect(block.state.phase).toBe(3);
    expect(events.filter((e) => e.kind === 'phase').map((e) => e.kind)).toHaveLength(4);
    expect(block.current.name).toBe('Unfolded Curator');
    const share = block.state.enemyHp / block.state.maxHp;
    expect(share).toBeLessThanOrEqual(0.6);
    expect(share).toBeGreaterThan(0.55);
    expect(block.state.shield).toBe(1);
    // One set of counts: the block's starts where the flat board's left off.
    expect(block.state.counts).toMatchObject({ mistakes: 2, zaps: 1, bombsUsed: 1 });
  });

  it('folds back at 30% with the counts the whole fight made, and the block remembers its own', () => {
    const flat = flatAt(0.59, { counts: { wrongFills: 2 } });
    const block = newBlock();
    block.enterBoard(handOver(curator, flat), blank());
    // A mistake and a patch kit on the block, then its HP falls into the last phase.
    block.mistake();
    block.state.counts.gadgetsUsed++;
    block.carry(Math.floor(block.state.maxHp * 0.29), blank());
    expect(boardAt(curator, block.state.phase + 1)).toBe('flat');

    const { state, entered } = enterFlat(curator, flat, block.state, 20);
    expect(entered.map((p) => p.board)).toEqual(['flat']);
    expect(state.phase).toBe(5);
    expect(state.enemyHp).toBeLessThanOrEqual(0.3 * curator.hp);
    expect(state.counts).toEqual({ wrongFills: 3, gadgetsUsed: 1 });
    // The flat board's own progress is as it was left.
    expect(state.struck).toEqual(flat.struck);
    expect(state.fog).toEqual(flat.fog);
  });

  it('a fight that ends on its block gives the flat battle its counts, for the tally', () => {
    const flat = flatAt(0.59, { counts: { wrongFills: 2 } });
    const block = newBlock();
    block.enterBoard(handOver(curator, flat), blank());
    block.mistake();
    const done = takeCounts(flat, block.state);
    expect(done.counts).toEqual({ wrongFills: 3 });
    expect({ ...done, counts: undefined }).toEqual({ ...flat, counts: undefined });
    // Taking the same counts again changes nothing.
    expect(takeCounts(done, block.state)).toBe(done);
  });

  it('every story boss that switches has a block in the 3D game, phase for phase', () => {
    const switching = runs
      .flatMap((r) => r.encounters)
      .filter((e) => e.enemy && switchesBoard(e.enemy));
    expect(switching.map((e) => e.id)).toContain('curator');
    for (const e of switching) {
      const block = getBlockEncounter(e.id);
      expect(block?.enemy, e.id).toBeTruthy();
      expect(block!.enemy!.phases?.map((p) => p.at)).toEqual(e.enemy!.phases!.map((p) => p.at));
    }
  });
});
