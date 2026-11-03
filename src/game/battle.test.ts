import { describe, expect, it } from 'vitest';
import {
  absorbHit,
  advancePhase,
  chip,
  clearFog,
  currentForm,
  finish,
  lineKey,
  startBattle,
  useGadget,
} from './battle';

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
  const bat = { ...goblin, fog: { rows: [1, 2], cols: [] } };

  it('starts with the enemy’s fog', () => {
    expect(startBattle(bat).fog).toEqual({ rows: [1, 2], cols: [] });
    expect(startBattle(goblin).fog).toBeUndefined();
  });

  it('lifts fog only from completed fogged lines', () => {
    const completed = [
      { kind: 'col' as const, index: 0 },
      { kind: 'row' as const, index: 2 },
    ];
    const { state, revealed } = clearFog(startBattle(bat), completed);
    expect(state.fog).toEqual({ rows: [1], cols: [] });
    expect(revealed).toEqual([{ kind: 'row', index: 2 }]);
  });
});

describe('phases', () => {
  const boss = {
    name: 'Gremlin',
    sprite: 'G',
    hp: 10,
    attack: 2,
    phases: [
      {
        at: 0.5,
        name: 'Overcharged Gremlin',
        sprite: 'O',
        attack: 3,
        fog: { rows: [1, 2, 4], cols: [] },
      },
    ],
  };

  it('waits until HP falls to the threshold', () => {
    const { state, entered } = advancePhase(boss, { ...startBattle(boss), enemyHp: 6 });
    expect(entered).toEqual([]);
    expect(currentForm(boss, state)).toEqual({ name: 'Gremlin', sprite: 'G', attack: 2 });
  });

  it('starts the phase: new form, harder hits, fog on lines not yet completed', () => {
    const start = { ...startBattle(boss), enemyHp: 5, struck: ['r2', 'c1'] };
    const { state, entered } = advancePhase(boss, start);
    expect(entered).toHaveLength(1);
    expect(state.phase).toBe(1);
    expect(state.fog).toEqual({ rows: [1, 4], cols: [] });
    expect(currentForm(boss, state)).toEqual({
      name: 'Overcharged Gremlin',
      sprite: 'O',
      attack: 3,
    });
    expect(advancePhase(boss, state).entered).toEqual([]); // only once
  });

  it('fogs only up to fogCount unsolved, unfogged lines, in priority order', () => {
    const picky = {
      ...boss,
      fog: { rows: [0], cols: [] },
      phases: [{ at: 0.5, fog: { rows: [0, 1, 2, 3], cols: [] }, fogCount: 2 }],
    };
    const start = { ...startBattle(picky), enemyHp: 5, struck: ['r1'] };
    expect(advancePhase(picky, start).state.fog).toEqual({ rows: [0, 2, 3], cols: [] });
  });

  it('keeps phase and fog through chip damage', () => {
    const { state } = advancePhase(boss, { ...startBattle(boss), enemyHp: 5 });
    expect(chip(state, ['c0']).state).toMatchObject({ phase: 1, fog: { rows: [1, 2, 4] } });
  });
});
