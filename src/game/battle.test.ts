import { describe, expect, it } from 'vitest';
import { chip, finish, lineKey, startBattle } from './battle';

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
