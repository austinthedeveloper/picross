import { describe, expect, it } from 'vitest';
import { absorbHit, chip, clearFog, finish, lineKey, startBattle, useGadget } from './battle';

const goblin = { name: 'Goblin', sprite: '👺', hp: 5, attack: 2 };

describe('battle', () => {
  it('chips once per newly completed line', () => {
    let { state, dealt } = chip(startBattle(goblin), [lineKey('row', 0), lineKey('col', 3)]);
    expect(dealt).toBe(2);
    expect(state.enemyHp).toBe(3);
    ({ state, dealt } = chip(state, ['r0', 'c3']));
    expect(dealt).toBe(0);
    expect(state.enemyHp).toBe(3);
  });

  it('keeps shields and fog when chipping', () => {
    const start = { ...startBattle(goblin), shield: 1, fog: { rows: [2], cols: [] } };
    const { state } = chip(start, ['r0']);
    expect(state.shield).toBe(1);
    expect(state.fog).toEqual({ rows: [2], cols: [] });
  });

  it('never chips the enemy below 1 HP', () => {
    const { state, dealt } = chip(startBattle(goblin), ['r0', 'r1', 'r2', 'r3', 'r4', 'r5']);
    expect(state.enemyHp).toBe(1);
    expect(dealt).toBe(4);
  });

  it('finishes with whatever HP is left', () => {
    const { state } = chip(startBattle(goblin), ['r0']);
    expect(finish(state)).toEqual({ state: { enemyHp: 0, struck: ['r0'] }, dealt: 4 });
  });
});

describe('gadgets in battle', () => {
  it('damages with chip rules', () => {
    const { state, dealt } = useGadget(startBattle(goblin), { kind: 'damage', amount: 3 });
    expect([state.enemyHp, dealt]).toEqual([2, 3]);
    expect(useGadget(state, { kind: 'damage', amount: 9 }).state.enemyHp).toBe(1);
  });

  it('shields block hits one at a time', () => {
    let { state } = useGadget(startBattle(goblin), { kind: 'shield', hits: 1 });
    let blocked;
    ({ state, blocked } = absorbHit(state));
    expect(blocked).toBe(true);
    ({ state, blocked } = absorbHit(state));
    expect(blocked).toBe(false);
  });
});

describe('fog', () => {
  // 3x2: ##. / .##
  const solution = { width: 3, height: 2, cells: [true, true, false, false, true, true] };
  const bat = { ...goblin, fog: { rows: [1], cols: [0, 2] } };

  it('starts with the enemy’s fog', () => {
    expect(startBattle(bat).fog).toEqual({ rows: [1], cols: [0, 2] });
    expect(startBattle(goblin).fog).toBeUndefined();
  });

  it('lifts fog where completed lines are filled', () => {
    const { state, revealed } = clearFog(startBattle(bat), [{ kind: 'row', index: 0 }], solution);
    expect(state.fog).toEqual({ rows: [1], cols: [2] });
    expect(revealed).toEqual([{ kind: 'col', index: 0 }]);
  });
});
