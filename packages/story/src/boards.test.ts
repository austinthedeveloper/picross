import { describe, expect, it } from 'vitest';
import { getEncounter as getBlockEncounter, KNOWN, storyIssues } from '@picross/block/story/data';
import { isPower, POWER_TIPS } from './fight/tips';
import { encounterFiles } from './puzzles/files/encounters';
import { runPuzzleFiles } from './puzzles/files/runPuzzles';

/**
 * The story's gate: every encounter and every power plays on both boards (#146, #167).
 *
 * - **Flat** (the 2D game) is where the story comes from: it plays an encounter whose 2D
 *   puzzle is in `run/`, and every power (its loader checks each enemy against its puzzle,
 *   and throws on anything it can't play).
 * - **Block** (Picross Cubed, and the 2D game's block phases) plays an encounter that has a
 *   3D puzzle (`packages/block/src/puzzles/story/`), and a power whose fields its loader
 *   reads (`KNOWN` in `packages/block/src/story/data.ts`).
 *
 * Both boards fight on the one battle, and every power runs on either (the parity test,
 * `apps/picross/src/game/powers.test.ts`), so this is a hard check: an encounter or a power
 * a board can't play fails, as does a power with no tip for each board
 * (`fight/tips.ts`). The report still prints with the test run. Broken data fails too: the
 * story's loaders throw on it (story.test.ts, and importing Cubed's loader here), and so
 * does a boss that switches to a block with no block to switch to.
 */

type Data = Record<string, unknown>;
type Board = 'flat' | 'block';

const records = (files: Record<string, { default: unknown }>) =>
  Object.values(files).map((mod) => mod.default as Data);

const encounters = records(encounterFiles);
const flatPuzzles = new Set(records(runPuzzleFiles).map((p) => String(p.id)));

/** The fields that turn each power on, on an enemy or one of its phases. */
const POWERS: Record<string, string[]> = {
  fog: ['fog', 'fogCount'],
  scramble: ['scramble', 'scrambleCount'],
  armor: ['armor'],
  fakes: ['fakes', 'suspects'],
  charge: ['charge'],
  ink: ['ink', 'inkCount'],
  swap: ['swap'],
  rotate: ['rotate'],
  'board switch': ['board'],
};
/** An enemy's and a phase's fields that aren't powers. */
const BASICS = new Set(['name', 'sprite', 'hp', 'attack', 'phases', 'at', 'taunt']);

/** A power's name by one of its fields; a field no power names is its own (a new power). */
const powerOf = (field: string) =>
  Object.keys(POWERS).find((power) => POWERS[power].includes(field)) ?? field;

/** Every power an encounter's enemy uses, with where each field is (`enemy` or `phase`). */
function powersOf(data: Data): Map<string, { field: string; on: 'enemy' | 'phase' }[]> {
  const powers = new Map<string, { field: string; on: 'enemy' | 'phase' }[]>();
  const add = (fields: Data, on: 'enemy' | 'phase') => {
    for (const field of Object.keys(fields)) {
      if (BASICS.has(field)) continue;
      const power = powerOf(field);
      powers.set(power, [...(powers.get(power) ?? []), { field, on }]);
    }
  };
  const enemy = data.enemy as Data | undefined;
  if (enemy) {
    add(enemy, 'enemy');
    for (const phase of (enemy.phases as Data[] | undefined) ?? []) add(phase, 'phase');
  }
  return powers;
}

const boardsForEncounter = (data: Data): Board[] => [
  ...(flatPuzzles.has(String(data.puzzle)) ? (['flat'] as const) : []),
  ...(getBlockEncounter(String(data.id)) ? (['block'] as const) : []),
];

const blockReads = (fields: { field: string; on: 'enemy' | 'phase' }[]) =>
  fields.every(({ field, on }) => KNOWN[on].includes(field));

/** Every encounter: the boards that play it, and the boards that play each of its powers. */
const report = encounters.map((data) => ({
  id: String(data.id),
  boards: boardsForEncounter(data),
  powers: [...powersOf(data)].map(([power, fields]) => ({
    power,
    boards: ['flat', ...(blockReads(fields) ? ['block'] : [])] as Board[],
  })),
}));

const both = (boards: Board[]) => boards.includes('flat') && boards.includes('block');

describe('the boards that can play the story', () => {
  it('reports every encounter and power', () => {
    expect(report).toHaveLength(encounters.length);

    const byBoards = new Map<string, string[]>();
    for (const e of report) {
      const key = e.boards.join(' + ') || 'none';
      byBoards.set(key, [...(byBoards.get(key) ?? []), e.id]);
    }
    const powers = new Map<string, { encounters: number; boards: Set<Board> }>();
    for (const e of report) {
      for (const p of e.powers) {
        const row = powers.get(p.power) ?? { encounters: 0, boards: new Set(p.boards) };
        row.encounters++;
        for (const board of row.boards) if (!p.boards.includes(board)) row.boards.delete(board);
        powers.set(p.power, row);
      }
    }

    const lines = [
      `The story on each board: ${report.filter((e) => both(e.boards)).length} of ${report.length} encounters play on both.`,
      ...[...byBoards].map(([boards, ids]) =>
        both(boards.split(' + ') as Board[])
          ? `  ${boards}: ${ids.length} encounters`
          : `  ${boards}: ${ids.length} (${ids.join(', ')})`,
      ),
      'Powers:',
      ...[...powers].map(
        ([power, row]) =>
          `  ${power}: ${[...row.boards].join(' + ') || 'none'} (${row.encounters} encounters)`,
      ),
      ...(storyIssues.length
        ? ["What Cubed can't play yet:", ...storyIssues.map((issue) => `  ${issue}`)]
        : ['Cubed plays all of it.']),
    ];
    console.log(lines.join('\n'));
  });

  it('plays every encounter on both boards', () => {
    expect(report.filter((e) => !both(e.boards)).map((e) => `${e.id}: ${e.boards}`)).toEqual([]);
    expect(storyIssues).toEqual([]);
  });

  it('plays every power on both boards, with a tip for each', () => {
    const unplayable = report.flatMap((e) =>
      e.powers.filter((p) => !both(p.boards)).map((p) => `${e.id}: ${p.power} (${p.boards})`),
    );
    expect(unplayable).toEqual([]);
    // A power is one the battle knows (or the board switch), and it explains itself on each board.
    const powers = new Set(report.flatMap((e) => e.powers.map((p) => p.power)));
    for (const power of powers) {
      if (power === 'board switch') continue;
      expect(isPower(power), `${power} has no tip`).toBe(true);
      expect(POWER_TIPS[power as keyof typeof POWER_TIPS].tip).toEqual({
        flat: expect.any(String),
        block: expect.any(String),
      });
    }
    expect(Object.keys(POWERS).filter((p) => p !== 'board switch')).toEqual(
      Object.keys(POWER_TIPS),
    );
  });

  // The 2D game plays a switching boss's block phases with Cubed's fight, so that boss must
  // have its block, with the same phases (packages/block/src/puzzles/story/).
  it('has a block for every boss that switches to one', () => {
    const switching = encounters.filter((data) =>
      ((data.enemy as Data | undefined)?.phases as Data[] | undefined)?.some(
        (phase) => phase.board === 'block',
      ),
    );
    expect(switching.map((data) => data.id)).toContain('curator');
    for (const data of switching) {
      const phases = (data.enemy as Data).phases as Data[];
      const block = getBlockEncounter(String(data.id));
      expect(block?.enemy, `${data.id} has no block to switch to`).toBeTruthy();
      expect(
        block!.enemy!.phases?.map((p) => p.at),
        String(data.id),
      ).toEqual(phases.map((p) => p.at));
      for (const p of report.find((e) => e.id === data.id)!.powers) {
        expect(p.boards, `${data.id}: ${p.power}`).toContain('block');
      }
    }
  });
});
