import { describe, expect, it } from 'vitest';
import { hashString } from '../puzzles/hide';
import { jobs, type Encounter } from '../story/data';
import { Battle, finishedLines, type BattleEvent } from './battle';
import { BROKEN, PAINTED } from './game';

/**
 * Golden traces of every story fight on a block (#168). The solver numbers
 * (apps/picross's fight-ratings.json) can't see armor, charge, ink, swaps, call-outs or
 * when phases land, so this plays each fight through the real `Battle` in a fixed order and
 * snapshots what happens at every step. Any change to how a fight plays shows up as a diff
 * in `__snapshots__/battleTraces.test.ts.snap`; update it with `vitest -u` only when the
 * change is meant.
 *
 * The script: the fight is built as a fight builds it (Hits on, seeded with the
 * encounter's id). Each step finishes the next unfinished line, emptiest of the shape
 * first, then by id, breaking every cube outside the shape (and painting a line that's all
 * shape), and calls `update`. A line the Mimic wiped is unfinished again, so it comes back
 * round. After the first step every suspect is called out; every 10th step is a mistake.
 * When every line is finished, the shape lands. Each step records its events and the
 * enemy's HP, and the rest of the state (phase, attack, hidden lines, meters, ink) when
 * it changes.
 */

const fights: Encounter[] = [
  ...new Map(
    jobs
      .flatMap((j) => j.encounters)
      .filter((e) => e.enemy)
      .map((e) => [e.id, e]),
  ).values(),
];

const ids = (list: readonly number[]) => `[${list.join(' ')}]`;

function event(e: BattleEvent): string {
  switch (e.kind) {
    case 'chip':
      return `chip ${e.amount}`;
    case 'armor-broken':
      return 'armor broken';
    case 'hit':
      return `hit ${e.amount} ${e.cause}`;
    case 'blocked':
      return `blocked ${e.cause}`;
    case 'grounded':
    case 'turn':
      return e.kind;
    case 'live':
      return `live ${e.line}`;
    case 'phase':
      return `phase ${e.index}`;
    case 'swap':
      return `swap ${ids(e.lines)} wiped ${e.wiped.length}`;
    case 'ink':
      return `ink ${e.cells.length}`;
    case 'washed':
      return `washed ${e.cells.length}`;
    case 'caught':
      return `caught ${e.line} ${e.amount}`;
    case 'honest':
      return `honest ${e.line}`;
    case 'healed':
      return `healed ${e.amount}`;
  }
}

/** The rest of the fight's state in a line (besides HP): what a step can change. */
function summary(b: Battle): string {
  const s = b.state;
  const parts = [`phase ${s.phase}`, `attack ${b.current.attack}`];
  if (s.fog.length) parts.push(`fog ${s.fog.length}`);
  if (s.scramble.length) parts.push(`scramble ${s.scramble.length}`);
  if (s.targets.length) parts.push(`targets ${s.targets.length} armor ${s.armorLines}`);
  if (s.suspects.length) parts.push(`suspects ${s.suspects.length} fakes ${s.fakes.length}`);
  if (s.charge) {
    const c = s.charge;
    parts.push(`charge ${c.meter}/${c.every} live ${c.live ?? '-'} warm ${c.warmUp}`);
  }
  if (s.turn) parts.push(`turn ${s.turn.meter}/${s.turn.every}`);
  if (s.ink.length) parts.push(`ink ${s.ink.length}`);
  return parts.join(' ');
}

function trace(e: Encounter): string {
  const { puzzle } = e;
  const b = new Battle(e.enemy!, puzzle, true, undefined, { seed: hashString(e.id) });
  const blocks = new Uint8Array(puzzle.solution.length);
  const s = b.state;
  const out = [
    `start hp ${s.maxHp} ${summary(b)}`,
    `picked fog ${ids(s.fog)} scramble ${ids(s.scramble)} targets ${ids(s.targets)} suspects ${ids(s.suspects)} fakes ${ids(s.fakes)}`,
  ];
  const shape = (id: number) => puzzle.lines[id].cells.filter((c) => puzzle.solution[c]).length;
  const order = puzzle.lines.map((l) => l.id).sort((a, b) => shape(a) - shape(b) || a - b);
  const limit = puzzle.lines.length * 3;
  let last = summary(b);
  for (let step = 1; step <= limit; step++) {
    const done = new Set(finishedLines(puzzle, blocks));
    const line = order.find((id) => !done.has(id));
    if (line === undefined) break;
    const cells = puzzle.lines[line].cells;
    const full = cells.every((c) => puzzle.solution[c]);
    for (const c of cells) {
      if (!puzzle.solution[c]) blocks[c] = BROKEN;
      else if (full) blocks[c] = PAINTED;
    }
    const events = b.update(blocks).map(event);
    if (step === 1) for (const id of [...s.suspects]) events.push(...b.callOut(id).map(event));
    if (step % 10 === 0) events.push(`mistake (${b.mistake().map(event).join(', ') || '-'})`);
    // The rest of the state only when it changes, to keep the snapshot readable.
    const now = summary(b);
    const changed = now === last ? '' : ` | ${now}`;
    last = now;
    out.push(`${step} line ${line}: ${events.join(', ') || '-'} | hp ${s.enemyHp}${changed}`);
    if (step === limit) out.push('stopped: the script never finished the block');
  }
  const before = s.phase;
  out.push(`finish ${b.finish()} (phase ${before}) counts ${JSON.stringify(s.counts)}`);
  return out.join('\n');
}

describe('block fight traces (#168)', () => {
  it('trace every story, Overtime and boss fight with a 3D puzzle', () => {
    expect(fights.length).toBeGreaterThan(50);
  });

  it.each(fights.map((e) => [e.id, e] as const))('%s', (_, e) => {
    expect(trace(e)).toMatchSnapshot();
  });
});
