import { describe, expect, it } from 'vitest';
import { lineKey } from '../engine/lines';
import {
  absorbHit,
  advancePhase,
  blastInk,
  bump,
  CALL_OUT_DAMAGE,
  callOut,
  clearInk,
  clearSuspects,
  clearWiped,
  markWiped,
  FALSE_ACCUSATION_HEAL,
  heal,
  WEAK_POINT_DAMAGE,
  chargeUp,
  chip,
  clearFog,
  clearScramble,
  currentForm,
  finish,
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

describe('fight counts', () => {
  it('counts each kind on its own, without changing anything else', () => {
    const start = { ...startBattle(goblin), shield: 1 };
    let state = bump(bump(start, 'wrongFills'), 'wrongFills');
    state = bump(state, 'zaps');
    expect(state.counts).toEqual({ wrongFills: 2, zaps: 1 });
    expect(state.shield).toBe(1);
    expect(start.counts).toBeUndefined();
  });

  it('survive everything else a fight does to its state', () => {
    let state = bump(startBattle(goblin), 'wrongFills');
    state = chip(state, ['r0']).state;
    state = useGadget(state, { kind: 'shield', hits: 1 }).state;
    state = absorbHit(state).state;
    expect(state.counts).toEqual({ wrongFills: 1 });
  });
});

describe('gadgets in battle', () => {
  it('damages with chip rules', () => {
    const { state, dealt } = useGadget(startBattle(goblin), { kind: 'blast', damage: 3 });
    expect([state.enemyHp, dealt]).toEqual([2, 3]);
    expect(useGadget(state, { kind: 'blast', damage: 9 }).state.enemyHp).toBe(1);
  });

  it('deals nothing at 1 HP', () => {
    const low = { ...startBattle(goblin), enemyHp: 1 };
    const { state, dealt } = useGadget(low, { kind: 'blast', damage: 2 });
    expect([state.enemyHp, dealt]).toEqual([1, 0]);
  });

  it('a blast washes only the ink it hits', () => {
    const inked = { ...startBattle(goblin), ink: [0, 1, 5] };
    const { state, washed } = blastInk(inked, [1, 5, 9]);
    expect(washed).toEqual([1, 5]);
    expect(state.ink).toEqual([0]);
    expect(blastInk(inked, [7]).state).toBe(inked);
    expect(blastInk(startBattle(goblin), [7]).washed).toEqual([]);
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
    expect(currentForm(boss, state)).toMatchObject({ name: 'Gremlin', sprite: 'G', attack: 2 });
  });

  it('starts the phase: new form, harder hits, fog on lines not yet completed', () => {
    const start = { ...startBattle(boss), enemyHp: 5, struck: ['r2', 'c1'] };
    const { state, entered } = advancePhase(boss, start);
    expect(entered).toHaveLength(1);
    expect(state.phase).toBe(1);
    expect(state.fog).toEqual({ rows: [1, 4], cols: [] });
    expect(currentForm(boss, state)).toMatchObject({
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

describe('scramble', () => {
  const owl = { ...goblin, scramble: { rows: [0, 2], cols: [1] } };

  it('starts with the enemy’s scramble and unscrambles completed lines', () => {
    const start = startBattle(owl);
    expect(start.scramble).toEqual({ rows: [0, 2], cols: [1] });
    const { state, revealed } = clearScramble(start, [
      { kind: 'row', index: 2 },
      { kind: 'col', index: 0 },
    ]);
    expect(state.scramble).toEqual({ rows: [0], cols: [1] });
    expect(revealed).toEqual([{ kind: 'row', index: 2 }]);
  });

  it('phases can scramble more lines from a pool', () => {
    const boss = {
      ...goblin,
      hp: 10,
      phases: [{ at: 0.5, scramble: { rows: [3, 4, 5], cols: [] }, scrambleCount: 2 }],
    };
    const { state } = advancePhase(boss, { ...startBattle(boss), enemyHp: 5, struck: ['r3'] });
    expect(state.scramble).toEqual({ rows: [4, 5], cols: [] });
  });
});

describe('armor', () => {
  const beetle = {
    ...goblin,
    hp: 20,
    attack: 2,
    armor: { weakPoints: { rows: [1], cols: [2] }, attack: 4 },
  };

  it('blocks ordinary lines and hits harder while up', () => {
    const start = startBattle(beetle);
    expect(currentForm(beetle, start)).toMatchObject({ attack: 4, armored: true });
    const { state, dealt } = chip(start, ['r0', 'c0']);
    expect(dealt).toBe(0);
    expect(state.struck).toEqual(['r0', 'c0']); // those lines never chip later
  });

  it('weak points deal triple damage, crack the armor, and break it', () => {
    let result = chip(startBattle(beetle), ['r1']);
    expect(result).toMatchObject({ dealt: WEAK_POINT_DAMAGE, cracked: ['r1'], broke: false });
    result = chip(result.state, ['c2', 'r4']);
    expect(result).toMatchObject({ dealt: WEAK_POINT_DAMAGE, cracked: ['c2'], broke: true });
    expect(currentForm(beetle, result.state)).toMatchObject({ attack: 2, armored: false });
    expect(chip(result.state, ['r5']).dealt).toBe(1); // normal rules after
  });
});

describe('forged clues', () => {
  const forger = { ...goblin, hp: 20, fakes: { rows: [1, 3], cols: [] } };

  it("starts with the enemy's forgeries", () => {
    expect(startBattle(forger).fakes).toEqual({ rows: [1, 3], cols: [] });
  });

  it('calling out a forgery unmasks it for call-out damage', () => {
    const { state, caught, dealt } = callOut(startBattle(forger), { kind: 'row', index: 3 });
    expect(caught).toBe(true);
    expect(dealt).toBe(CALL_OUT_DAMAGE);
    expect(state.fakes).toEqual({ rows: [1], cols: [] });
    expect(state.enemyHp).toBe(20 - CALL_OUT_DAMAGE);
  });

  it('accusing an honest clue changes nothing here', () => {
    const before = startBattle(forger);
    const result = callOut(before, { kind: 'col', index: 1 });
    expect(result).toEqual({ state: before, caught: false, dealt: 0 });
  });

  it('call-out damage never drops the enemy below 1 HP', () => {
    const low = { ...startBattle(forger), enemyHp: 2 };
    expect(callOut(low, { kind: 'row', index: 1 }).state.enemyHp).toBe(1);
  });

  it('a false accusation in a Relaxed run heals, up to max HP', () => {
    const hurt = { ...startBattle(forger), enemyHp: 10 };
    expect(heal(hurt, 20)).toMatchObject({ healed: FALSE_ACCUSATION_HEAL });
    expect(heal({ ...hurt, enemyHp: 19 }, 20).state.enemyHp).toBe(20);
  });
});

describe('charge and ink', () => {
  const eel = {
    ...goblin,
    hp: 20,
    charge: 5,
    phases: [{ at: 0.5, name: 'Overcharged', charge: 4 }],
  };

  it('a phase can speed up the charge meter', () => {
    const state = startBattle(eel);
    expect(currentForm(eel, state).charge).toBe(5);
    expect(currentForm(eel, { ...state, phase: 1 }).charge).toBe(4);
  });

  describe('chargeUp', () => {
    const live = { kind: 'row', index: 2 } as const;
    const other = (index: number) => ({ kind: 'col', index }) as const;
    const charged = { ...startBattle(eel), live, charged: 2 };

    it('other lines charge the meter, one each', () => {
      const result = chargeUp(charged, [other(0), other(1)], 5);
      expect(result.state.charged).toBe(4);
      expect(result.state.live).toEqual(live);
      expect(result).toMatchObject({ grounded: false, zapped: false });
    });

    it('zaps when the meter fills, then starts over with no live line', () => {
      const result = chargeUp(charged, [other(0), other(1), other(2)], 5);
      expect(result.zapped).toBe(true);
      expect(result.state.charged).toBe(0);
      expect(result.state.live).toBeUndefined();
    });

    it('the live line grounds it, even when it would have filled the meter', () => {
      const result = chargeUp(charged, [other(0), other(1), other(2), live], 5);
      expect(result).toMatchObject({ grounded: true, zapped: false });
      expect(result.state.charged).toBe(0);
      expect(result.state.live).toBeUndefined();
    });

    it('does nothing with no live line', () => {
      const state = startBattle(eel);
      expect(chargeUp(state, [other(0)], 5).state).toBe(state);
    });
  });

  it('completed lines wash out ink', () => {
    const state = { ...startBattle(goblin), ink: [0, 1, 5] };
    const { state: next, washed } = clearInk(state, [{ kind: 'row', index: 0 }], 4);
    expect(washed).toEqual([0, 1]);
    expect(next.ink).toEqual([5]);
    expect(clearInk(next, [{ kind: 'row', index: 3 }], 4).state).toBe(next);
  });

  it('a sponge wipes all the ink', () => {
    const state = { ...startBattle(goblin), ink: [0, 1, 5] };
    expect(useGadget(state, { kind: 'wash' }).state.ink).toEqual([]);
  });
});

describe('wiped lines', () => {
  it('stay marked until you complete them again', () => {
    let state = markWiped(startBattle(goblin), 'row', [2, 5]);
    state = markWiped(state, 'row', [5]);
    expect(state.wiped).toEqual({ rows: [2, 5], cols: [] });
    const { state: next, revealed } = clearWiped(state, [{ kind: 'row', index: 5 }]);
    expect(revealed).toEqual([{ kind: 'row', index: 5 }]);
    expect(next.wiped).toEqual({ rows: [2], cols: [] });
  });
});

describe('suspects', () => {
  const forger = {
    ...goblin,
    hp: 20,
    fakes: { rows: [1], cols: [] },
    suspects: { rows: [0, 1, 2], cols: [] },
  };

  it('a solved suspect was honest: its 🎭 comes off', () => {
    const { state, revealed } = clearSuspects(startBattle(forger), [{ kind: 'row', index: 2 }]);
    expect(revealed).toEqual([{ kind: 'row', index: 2 }]);
    expect(state.suspects).toEqual({ rows: [0, 1], cols: [] });
  });

  it('calling out a fake clears it from the suspects too', () => {
    const { state, caught } = callOut(startBattle(forger), { kind: 'row', index: 1 });
    expect(caught).toBe(true);
    expect(state.suspects).toEqual({ rows: [0, 2], cols: [] });
  });

  it('accusing an honest suspect fails, but settles it', () => {
    const { state, caught } = callOut(startBattle(forger), { kind: 'row', index: 0 });
    expect(caught).toBe(false);
    expect(state.suspects).toEqual({ rows: [1, 2], cols: [] });
    expect(state.enemyHp).toBe(20);
  });
});
