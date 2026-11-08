import { describe, expect, it } from 'vitest';
import { solve } from '../engine/solver';
import { parsePuzzle, type PuzzleFile } from '../puzzles/format';
import mushroomFile from '../puzzles/pack/mushroom.json';
import type { Enemy } from '../story/data';
import { Battle, finishedLines, TARGET_DAMAGE, type BattleEvent } from './battle';
import { BROKEN, PAINTED, SOLID } from './game';

const puzzle = parsePuzzle(mushroomFile as PuzzleFile);
const enemy = (extra: Partial<Enemy> = {}): Enemy => ({
  name: 'Test',
  sprite: 'goblin',
  hp: 200,
  attack: 2,
  ...extra,
});
const blank = () => new Uint8Array(puzzle.solution.length);
/** Breaks every cube outside the shape in a line: finishes it. */
function finish(blocks: Uint8Array, line: number) {
  for (const c of puzzle.lines[line].cells) if (!puzzle.solution[c]) blocks[c] = BROKEN;
}
const kinds = (events: BattleEvent[]) => events.map((e) => e.kind);

describe('Battle', () => {
  it('chips 1 per finished line, never below 1; the shape finishes it', () => {
    const b = new Battle(enemy({ hp: 3 }), puzzle, true);
    const blocks = blank();
    // A line with no shape cubes in it: break it all.
    const empty = puzzle.lines.find((l) => l.cells.every((c) => !puzzle.solution[c]))!;
    finish(blocks, empty.id);
    const events = b.update(blocks);
    const chip = events.find((e) => e.kind === 'chip')!;
    expect(chip.kind === 'chip' && chip.lines.length).toBeGreaterThan(0);
    for (const l of puzzle.lines) finish(blocks, l.id);
    b.update(blocks);
    expect(b.state.enemyHp).toBe(1);
    expect(b.finish()).toBe(1);
  });

  it('counts finished lines by the truth; all-shape lines need painting', () => {
    const blocks = blank();
    expect(finishedLines(puzzle, blocks)).toEqual([]);
    const full = puzzle.lines.find((l) => l.cells.every((c) => puzzle.solution[c]))!;
    for (const c of full.cells) blocks[c] = PAINTED;
    expect(finishedLines(puzzle, blocks)).toContain(full.id);
  });

  it('fogs and scrambles lines, keeping the block solvable', () => {
    const b = new Battle(enemy({ fog: 6, scramble: 4 }), puzzle, true, undefined, { seed: 5 });
    expect(b.state.fog.length).toBeGreaterThan(0);
    for (const id of b.state.fog) expect(b.clueFor(id)).toBeNull();
    for (const id of b.state.scramble) expect(b.clueFor(id)).toMatchObject({ pieces: null });
    const clues = puzzle.lines.map((l) => b.clueFor(l.id));
    expect(solve(puzzle.dims, clues, undefined, puzzle.lines).solved).toBe(true);
  });

  it('lifts fog off a line once it is finished', () => {
    const b = new Battle(enemy({ fog: 4 }), puzzle, true, undefined, { seed: 2 });
    const blocks = blank();
    const line = b.state.fog[0];
    finish(blocks, line);
    b.update(blocks);
    expect(b.clueFor(line)).toEqual(puzzle.allClues[line]);
  });

  it('armor: only targets hurt, triple, and it hits back every 5 other lines', () => {
    const b = new Battle(enemy({ armor: { targets: 1, attack: 2 } }), puzzle, true, undefined, {
      seed: 3,
    });
    const blocks = blank();
    const others = puzzle.lines.filter((l) => !b.state.targets.includes(l.id)).slice(0, 5);
    for (const l of others) finish(blocks, l.id);
    const events = b.update(blocks);
    const fresh = b.state.struck.length;
    expect(b.state.enemyHp).toBe(200);
    expect(kinds(events).filter((k) => k === 'hit').length).toBe(Math.floor(fresh / 5));
    finish(blocks, b.state.targets[0]);
    const after = b.update(blocks);
    expect(kinds(after)).toContain('armor-broken');
    expect(200 - b.state.enemyHp).toBeGreaterThanOrEqual(TARGET_DAMAGE);
  });

  it('forges clues among suspects, and calling one out works both ways', () => {
    const relaxed = new Battle(
      enemy({ fakes: { fakes: 1, suspects: 3 } }),
      puzzle,
      false,
      undefined,
      {
        seed: 4,
      },
    );
    const [fake] = relaxed.state.fakes;
    expect(relaxed.state.suspects.length).toBe(3);
    expect(relaxed.clueFor(fake)).not.toEqual(puzzle.allClues[fake]);
    const honest = relaxed.state.suspects.find((id) => id !== fake)!;
    relaxed.state.enemyHp = 100;
    expect(kinds(relaxed.callOut(honest))).toEqual(['honest', 'healed']);
    expect(kinds(relaxed.callOut(fake))).toEqual(['caught']);
    expect(relaxed.clueFor(fake)).toEqual(puzzle.allClues[fake]);
  });

  it('charges after a warm-up, grounds on the live line, zaps when full', () => {
    const b = new Battle(enemy({ charge: 2 }), puzzle, true, undefined, { seed: 6 });
    b.state.charge!.warmUp = 0;
    const blocks = blank();
    const empty = puzzle.lines.filter((l) => l.cells.every((c) => !puzzle.solution[c]));
    finish(blocks, empty[0].id);
    const first = b.update(blocks);
    const live = b.state.charge!.live;
    expect(kinds(first)).toContain('live');
    finish(blocks, live!);
    expect(kinds(b.update(blocks))).toContain('grounded');
    // Two lines that aren't live fill the meter: a zap.
    const next = b.state.charge!.live!;
    const others = empty.filter((l) => l.id !== next && !b.state.struck.includes(l.id)).slice(0, 2);
    for (const l of others) finish(blocks, l.id);
    const after = b.update(blocks);
    if (!after.some((e) => e.kind === 'grounded')) expect(kinds(after)).toContain('hit');
  });

  it('blocks a hit with a shield, and never hits in Relaxed', () => {
    const b = new Battle(enemy(), puzzle, true);
    b.shieldUp(1);
    expect(kinds(b.mistake())).toEqual(['blocked']);
    expect(kinds(b.mistake())).toEqual(['hit']);
    expect(new Battle(enemy(), puzzle, false).mistake()).toEqual([]);
  });

  it('phases change the enemy and bring their powers', () => {
    const b = new Battle(
      enemy({ hp: 10, phases: [{ at: 0.9, name: 'Angry', attack: 5, swap: true, ink: 2 }] }),
      puzzle,
      true,
      undefined,
      { seed: 7 },
    );
    const blocks = blank();
    // Some work for the swap and ink to land on, and two finished lines to bring the phase.
    for (let i = 0; i < blocks.length; i += 3) if (puzzle.solution[i]) blocks[i] = PAINTED;
    const empty = puzzle.lines.filter((l) => l.cells.every((c) => !puzzle.solution[c]));
    for (const l of empty.slice(0, 2)) finish(blocks, l.id);
    blocks[empty[5].cells[0]] = BROKEN;
    const events = b.update(blocks);
    expect(kinds(events)).toContain('phase');
    expect(b.current).toMatchObject({ name: 'Angry', attack: 5 });
    const swap = events.find((e) => e.kind === 'swap');
    if (swap?.kind === 'swap') for (const c of swap.wiped) expect(blocks[c]).toBe(SOLID);
  });

  it('saves and resumes', () => {
    const b = new Battle(enemy({ fog: 3 }), puzzle, true, undefined, { seed: 9 });
    const again = new Battle(enemy({ fog: 3 }), puzzle, true, JSON.parse(JSON.stringify(b.state)));
    expect(again.state.fog).toEqual(b.state.fog);
  });
});
