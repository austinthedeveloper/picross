import { describe, expect, it } from 'vitest';
import { parsePuzzle } from './format';
import { solve, solveLine, solveLineAnyOrder, Unknown, type Knowledge } from '../engine/solver';
import { CHIP_DAMAGE, type Enemy } from '../game/battle';
import { allScramble, allUnreadable } from './enemies';
import { scenes } from './scenes';
import {
  bossFights,
  bossFightsFor,
  getRun,
  overtimeFor,
  overtimeRuns,
  parseEncounter,
  parseRun,
  restHeal,
  runs,
  type Encounter,
} from './runs';

const puzzle = parsePuzzle({ id: 'p', name: 'P', width: 2, height: 1, solution: ['#.'] });
const find = (id: string) => (id === 'p' ? puzzle : undefined);
const enemy = { name: 'Goblin', sprite: '👺', hp: 10, attack: 2 };
const encounter = { id: 'e', name: 'E', kind: 'fight', puzzle: 'p', enemy };

describe('parseEncounter', () => {
  it('resolves its puzzle and enemy', () => {
    const parsed = parseEncounter(encounter, find);
    expect(parsed.puzzle).toBe(puzzle);
    expect(parsed.enemy).toEqual(enemy);
  });

  it('only gives fights an enemy', () => {
    expect(parseEncounter({ ...encounter, kind: 'dig' }, find).enemy).toBeUndefined();
  });

  it.each([
    [{ ...encounter, kind: 'shop' }, /kind/],
    [{ ...encounter, puzzle: 'nope' }, /unknown puzzle "nope"/],
    [{ ...encounter, name: '' }, /missing name/],
    [{ ...encounter, enemy: undefined }, /need an enemy/],
    [{ ...encounter, enemy: { ...enemy, hp: 0 } }, /hp/],
    [{ ...encounter, enemy: { ...enemy, fog: { rows: [5] } } }, /fog rows and cols/],
    [{ ...encounter, enemy: { ...enemy, fog: { rows: [0], cols: [0] } } }, /not both/],
    [
      {
        ...encounter,
        enemy: { ...enemy, fog: { rows: [0] }, phases: [{ at: 0.5, fog: { cols: [0] } }] },
      },
      /not both/,
    ],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 1.5 }] } }, /between 0 and 1/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.3 }, { at: 0.6 }] } }, /decreasing/],
    [{ ...encounter, scene: 'nope' }, /unknown scene "nope"/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.5, swap: 'yes' }] } }, /swap must be/],
    [{ ...encounter, enemy: { ...enemy, armor: { weakPoints: {}, attack: 3 } } }, /weak points/],
    // the test puzzle is 2x1 '#.': row 1's runs are just "1", so its order is already known
    [{ ...encounter, enemy: { ...enemy, scramble: { rows: [0] } } }, /only one order/],
    [{ ...encounter, enemy: { ...enemy, fakes: {} } }, /at least one line/],
    [{ ...encounter, enemy: { ...enemy, suspects: { rows: [0] } } }, /only make sense with fakes/],
    [{ ...encounter, enemy: { ...enemy, charge: 1 } }, /charge must be at least 2 lines/],
    [{ ...encounter, kind: 'rest', enemy: undefined }, /rest stops need/],
    [{ ...encounter, kind: 'rest', rest: { seconds: 60, heal: 1 } }, /heal must be more than 1/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.5, ink: 0 }] } }, /ink must be/],
    [{ ...encounter, enemy: { ...enemy, phases: [{ at: 0.5, inkCount: 2 }] } }, /no ink/],
    [
      { ...encounter, enemy: { ...enemy, fog: { rows: [0] }, fakes: { rows: [0] } } },
      /both forged and fogged/,
    ],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseEncounter(input, find)).toThrow(error);
  });
});

describe('parseRun', () => {
  const e = parseEncounter(encounter, find);
  const findEncounter = (id: string) => (id === 'e' ? e : undefined);

  it('resolves its encounters in order', () => {
    const run = parseRun({ id: 'r', name: 'R', hp: 5, encounters: ['e', 'e'] }, findEncounter);
    expect(run.encounters).toEqual([e, e]);
    expect(run.gadgets).toEqual([]);
  });

  it.each([
    [{ id: 'r', name: 'R', hp: 0, encounters: ['e'] }, /hp/],
    [{ id: 'r', name: 'R', hp: 5, encounters: [] }, /needs encounters/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['x'] }, /unknown encounter "x"/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['e'], gadgets: ['laser'] }, /unknown gadget/],
    [{ id: 'r', name: 'R', hp: 5, encounters: ['e'], intro: 'nope' }, /unknown intro scene/],
  ])('rejects bad input %#', (input, error) => {
    expect(() => parseRun(input, findEncounter)).toThrow(error);
  });
});

describe('bundled runs', () => {
  it('starts with an open job, and every locked job unlocks from a real one', () => {
    expect(runs[0].requires).toBeUndefined();
    for (const run of runs) {
      expect(run.encounters.length).toBeGreaterThan(0);
      if (run.requires) expect(getRun(run.requires)).toBeDefined();
    }
  });
});

describe('Boss fights', () => {
  it('are one boss fight each, unlocked by a real job, and stay off the board', () => {
    expect(bossFights.length).toBeGreaterThan(0);
    for (const run of bossFights) {
      expect(runs).not.toContain(run);
      expect(getRun(run.bossOf!)).toBeDefined();
      expect(run.requires).toBe(run.bossOf);
      expect(bossFightsFor(run.bossOf!)).toContain(run);
      expect(run.encounters).toHaveLength(1);
      expect(run.encounters[0].boss).toBe(true);
    }
  });
});

describe('Overtime', () => {
  it('has a job of its own to replay, and stays off the board', () => {
    expect(overtimeRuns.length).toBeGreaterThan(0);
    for (const run of overtimeRuns) {
      expect(runs).not.toContain(run);
      expect(getRun(run.overtimeOf!)).toBeDefined();
      expect(run.requires).toBe(run.overtimeOf);
      expect(overtimeFor(run.overtimeOf!)).toBe(run);
    }
  });

  it('comes with every job but Closing Time, leaving the Curator out', () => {
    const jobs = runs.map((run) => run.id).filter((id) => id !== 'closing-time');
    expect(overtimeRuns.map((run) => run.overtimeOf).sort()).toEqual(jobs.sort());
    for (const run of overtimeRuns) {
      for (const e of run.encounters) expect(e.id).not.toMatch(/curator/);
    }
  });

  it('follows its job node for node, on the same pictures', () => {
    for (const run of overtimeRuns) {
      const job = getRun(run.overtimeOf!)!;
      expect(run.encounters.length, run.id).toBe(job.encounters.length);
      run.encounters.forEach((e, i) => {
        const story = job.encounters[i];
        expect([story.id, `overtime-${story.id}`], run.id).toContain(e.id);
        expect(e.puzzle, e.id).toBe(story.puzzle);
        expect(e.kind, e.id).toBe(story.kind);
      });
    }
  });

  it("doesn't change the story version of the job", () => {
    const story = getRun('night-shift')!.encounters.map((e) => e.id);
    expect(story).toEqual([
      'mimic',
      'clockwork-owl',
      'forger',
      'dusty-exhibit',
      'armored-beetle',
      'break-room',
      'museum-rex',
    ]);
  });

  it('gives every fight more powers than its story version', () => {
    const powers = (e: Encounter) =>
      phasePowersOf(e.enemy!).length + size(allUnreadable(e.enemy!)) + size(allScramble(e.enemy!));
    for (const run of overtimeRuns) {
      const job = getRun(run.overtimeOf!)!;
      run.encounters.forEach((e, i) => {
        if (e.enemy) expect(powers(e), e.id).toBeGreaterThan(powers(job.encounters[i]));
      });
    }
  });

  it('never replays a story scene mid-fight', () => {
    for (const run of overtimeRuns) {
      for (const e of run.encounters) expect(e.scene, e.id).toBeUndefined();
    }
  });
});

const size = (f: { rows: number[]; cols: number[] }) => f.rows.length + f.cols.length;
const phasePowersOf = (enemy: Enemy) =>
  (enemy.phases ?? []).flatMap((p) => [p.swap, p.ink, p.charge].filter(Boolean));

describe('bundled fights', () => {
  const fights = [...runs, ...overtimeRuns, ...bossFights]
    .flatMap((r) => r.encounters)
    .filter((e) => e.enemy);

  // Chip damage from every row and column should leave at least a third of the
  // enemy's HP for the finisher, so finishing the picture is the big hit.
  it.each(fights.map((e) => [e.id, e] as const))('%s leaves room for the finisher', (_, e) => {
    const maxChip = (e.puzzle.width + e.puzzle.height) * CHIP_DAMAGE;
    expect(maxChip).toBeLessThanOrEqual((e.enemy!.hp * 2) / 3);
  });

  // Fogged, forged, and scrambled clues can't be trusted until you solve their
  // lines, so the puzzle must be solvable without guessing even with everything the
  // enemy can bring (starting and from every phase) applied from the very start.
  const tricky = fights.filter(
    (e) => size(allUnreadable(e.enemy!)) + size(allScramble(e.enemy!)) > 0,
  );
  it.each(tricky.map((e) => [e.id, e] as const))(
    '%s is solvable through everything it does',
    (_, e) => {
      const { width, height, clues } = e.puzzle;
      const result = solve(width, height, clues, {
        fog: allUnreadable(e.enemy!),
        scramble: allScramble(e.enemy!),
      });
      expect(result.status).toBe('unique');
    },
  );
});

describe('armored fights', () => {
  /** Weak points must be solvable this early, or the armor's hits couldn't be avoided (#116). */
  const WEAK_POINT_PASS_LIMIT = 2;

  /**
   * The pass of a line solver in which a line becomes fully known, reading clues
   * as the player can at the start: unreadable ones wait for their crossing lines.
   */
  function passKnown(e: Encounter, target: { kind: 'row' | 'col'; index: number }): number {
    const { width: w, height: h, clues } = e.puzzle;
    const { fog, suspects, fakes, scramble } = e.enemy!;
    const blocked = (key: 'rows' | 'cols', i: number) =>
      [fog, suspects, fakes].some((set) => set?.[key].includes(i));
    const grid: Knowledge[] = new Array(w * h).fill(Unknown);
    const rowCells = (r: number) => Array.from({ length: w }, (_, c) => r * w + c);
    const colCells = (c: number) => Array.from({ length: h }, (_, r) => r * w + c);
    const goal = target.kind === 'row' ? rowCells(target.index) : colCells(target.index);
    const work = (key: 'rows' | 'cols', i: number, cells: number[], runs: number[]) => {
      if (blocked(key, i)) return false;
      const line = cells.map((n) => grid[n]);
      const out = scramble?.[key].includes(i)
        ? solveLineAnyOrder(line, runs)
        : solveLine(line, runs);
      let changed = false;
      out?.forEach((value, n) => {
        if (grid[cells[n]] !== value) {
          grid[cells[n]] = value;
          changed = true;
        }
      });
      return changed;
    };
    for (let pass = 1; ; pass++) {
      let changed = false;
      for (let r = 0; r < h; r++) changed = work('rows', r, rowCells(r), clues.rows[r]) || changed;
      for (let c = 0; c < w; c++) changed = work('cols', c, colCells(c), clues.cols[c]) || changed;
      if (goal.every((n) => grid[n] !== Unknown)) return pass;
      if (!changed) return Infinity;
    }
  }

  const armored = [...new Set([...runs, ...overtimeRuns].flatMap((r) => r.encounters))].filter(
    (e) => e.enemy?.armor,
  );

  it('are all checked', () => {
    expect(armored.length).toBeGreaterThanOrEqual(9);
  });

  it.each(armored.map((e) => [e.id, e] as const))(
    '%s has weak points you can go after early',
    (_, e) => {
      const { rows, cols } = e.enemy!.armor!.weakPoints;
      const lines = [
        ...rows.map((index) => ({ kind: 'row' as const, index })),
        ...cols.map((index) => ({ kind: 'col' as const, index })),
      ];
      for (const line of lines) {
        expect(passKnown(e, line), `${line.kind} ${line.index}`).toBeLessThanOrEqual(
          WEAK_POINT_PASS_LIMIT,
        );
      }
    },
  );
});

describe('rest stops', () => {
  it('give the full heal in time and a little after', () => {
    const rest = { seconds: 90, heal: 4 };
    expect(restHeal(rest, 89_000)).toBe(4);
    expect(restHeal(rest, 90_000)).toBe(4);
    expect(restHeal(rest, 90_001)).toBe(1);
  });

  it('come right before every boss', () => {
    for (const job of runs) {
      const boss = job.encounters.findIndex((e) => e.boss);
      if (boss > 0) expect(job.encounters[boss - 1].kind).toBe('rest');
    }
  });
});

describe('scenes the runs play', () => {
  // Here rather than in backdrops.test.ts, which stays free of runs so the 3D game
  // (picross-3d) can share it.
  it('all have a backdrop, except outros', () => {
    // A run's outro is only ever text on the results screen.
    const outros = new Set(runs.map((run) => run.outro));
    const bare = scenes.filter((scene) => !scene.backdrop && !outros.has(scene.id));
    expect(bare.map((scene) => scene.id)).toEqual([]);
  });
});
