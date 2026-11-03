import { getPuzzle } from './index';
import type { Fog } from '../engine/fog';
import type { Enemy, Phase } from '../game/battle';
import type { Puzzle } from './format';
import { getGadget } from './gadgets';
import { getScene } from './scenes';

/** What kind of node an encounter is. Fights and digs play differently from #27 and #29 on. */
export type EncounterKind = 'fight' | 'dig';

export interface EncounterFile {
  id: string;
  name: string;
  kind: EncounterKind;
  /** Id of the puzzle played in this encounter. */
  puzzle: string;
  /** One line of flavor shown on the run map. */
  blurb?: string;
  /** Required for fights. */
  enemy?: Enemy;
  /** A boss node: stands out on the map (#42). */
  boss?: boolean;
  /** Scene played the first time you open this node (#42). */
  scene?: string;
}

export interface Encounter extends Omit<EncounterFile, 'puzzle'> {
  puzzle: Puzzle;
}

function parseEnemy(data: unknown, puzzle: Puzzle, fail: (msg: string) => never): Enemy {
  const enemy = data as Partial<Enemy> | undefined;
  if (!enemy || typeof enemy !== 'object') return fail('fights need an enemy');
  if (typeof enemy.name !== 'string' || !enemy.name) fail('enemy needs a name');
  if (!Number.isInteger(enemy.hp) || enemy.hp! < 1) fail('enemy hp must be a positive integer');
  if (!Number.isInteger(enemy.attack) || enemy.attack! < 0) {
    fail('enemy attack must be a whole number');
  }
  const parsed: Enemy = {
    name: enemy.name!,
    sprite: typeof enemy.sprite === 'string' ? enemy.sprite : '👾',
    hp: enemy.hp!,
    attack: enemy.attack!,
  };
  const parseFog = (data: unknown): Fog => {
    const { rows = [], cols = [] } = (data ?? {}) as Partial<Fog>;
    const inRange = (list: unknown, size: number) =>
      Array.isArray(list) && list.every((i) => Number.isInteger(i) && i >= 0 && i < size);
    if (!inRange(rows, puzzle.height) || !inRange(cols, puzzle.width)) {
      fail('fog rows and cols must be line indexes within the puzzle');
    }
    return { rows: [...rows], cols: [...cols] };
  };
  // A scrambled line needs at least two different run lengths, or its order is already known.
  const parseScramble = (data: unknown): Fog => {
    const scramble = parseFog(data);
    for (const [kind, list] of [
      ['row', scramble.rows],
      ['col', scramble.cols],
    ] as const) {
      for (const i of list) {
        const runs = (kind === 'row' ? puzzle.clues.rows : puzzle.clues.cols)[i];
        if (new Set(runs).size < 2) {
          fail(
            `${kind} ${i + 1} can't be scrambled: its runs (${runs.join(' ') || 'none'}) have only one order`,
          );
        }
      }
    }
    return scramble;
  };
  const positiveCount = (value: unknown, label: string) => {
    if (value !== undefined && (!Number.isInteger(value) || (value as number) < 1)) {
      fail(`${label} must be a positive whole number`);
    }
  };

  if (enemy.fog !== undefined) parsed.fog = parseFog(enemy.fog);
  if (enemy.scramble !== undefined) parsed.scramble = parseScramble(enemy.scramble);
  if (enemy.armor !== undefined) {
    const armor = enemy.armor as Partial<Enemy['armor'] & object>;
    const weakPoints = parseFog(armor.weakPoints);
    if (!weakPoints.rows.length && !weakPoints.cols.length) fail('armor needs weak points');
    if (!Number.isInteger(armor.attack) || armor.attack! < 0) {
      fail('armor attack must be a whole number');
    }
    parsed.armor = { weakPoints, attack: armor.attack! };
  }

  if (enemy.phases !== undefined) {
    if (!Array.isArray(enemy.phases)) fail('phases must be a list');
    parsed.phases = enemy.phases!.map((data, i): Phase => {
      const phase = (data ?? {}) as Partial<Phase>;
      const at = phase.at;
      if (typeof at !== 'number' || !(at > 0 && at < 1))
        fail(`phase ${i + 1} needs "at" between 0 and 1`);
      if (i > 0 && at! >= enemy.phases![i - 1].at) fail('phases must trigger at decreasing HP');
      if (phase.attack !== undefined && (!Number.isInteger(phase.attack) || phase.attack < 0)) {
        fail(`phase ${i + 1} attack must be a whole number`);
      }
      positiveCount(phase.fogCount, `phase ${i + 1} fogCount`);
      positiveCount(phase.scrambleCount, `phase ${i + 1} scrambleCount`);
      if (phase.swap !== undefined && typeof phase.swap !== 'boolean') {
        fail(`phase ${i + 1} swap must be true or false`);
      }
      return {
        at: at!,
        ...(phase.name ? { name: phase.name } : {}),
        ...(phase.sprite ? { sprite: phase.sprite } : {}),
        ...(phase.attack !== undefined ? { attack: phase.attack } : {}),
        ...(phase.taunt ? { taunt: phase.taunt } : {}),
        ...(phase.fog !== undefined ? { fog: parseFog(phase.fog) } : {}),
        ...(phase.fogCount !== undefined ? { fogCount: phase.fogCount } : {}),
        ...(phase.swap === true ? { swap: true } : {}),
        ...(phase.scramble !== undefined ? { scramble: parseScramble(phase.scramble) } : {}),
        ...(phase.scrambleCount !== undefined ? { scrambleCount: phase.scrambleCount } : {}),
      };
    });
  }

  // The cell where a fogged row and column cross could never be worked out, so all
  // of an enemy's fog (starting and from every phase) must be in one direction.
  const all = allFog(parsed);
  if (all.rows.length && all.cols.length) fail('fog can cover rows or columns, not both');
  return parsed;
}

function checkScene(id: unknown, fail: (msg: string) => never): string {
  if (typeof id !== 'string' || !getScene(id)) return fail(`unknown scene "${String(id)}"`);
  return id;
}

/** Every line an enemy can ever fog: its starting fog plus every phase's. */
export function allFog(enemy: Enemy): Fog {
  return unionOf([enemy.fog, ...(enemy.phases ?? []).map((p) => p.fog)]);
}

/** Every line an enemy can ever scramble: its starting scramble plus every phase's. */
export function allScramble(enemy: Enemy): Fog {
  return unionOf([enemy.scramble, ...(enemy.phases ?? []).map((p) => p.scramble)]);
}

function unionOf(list: (Fog | undefined)[]): Fog {
  const sets = list.filter((f): f is Fog => Boolean(f));
  const union = (key: 'rows' | 'cols') => [...new Set(sets.flatMap((f) => f[key]))];
  return { rows: union('rows'), cols: union('cols') };
}

/** A run: an ordered path of encounters. */
export interface RunFile {
  id: string;
  name: string;
  /** Player HP at the start of the run. */
  hp: number;
  encounters: string[];
  /** Gadget ids the player starts with. */
  gadgets?: string[];
  /** Scene played before the first run (#31). */
  intro?: string;
  /** Scene whose line (picked by the `won` flag) signs off the results screen. */
  outro?: string;
}

export interface RunDef extends Omit<RunFile, 'encounters' | 'gadgets'> {
  encounters: Encounter[];
  gadgets: string[];
}

const KINDS: EncounterKind[] = ['fight', 'dig'];

export function parseEncounter(
  data: unknown,
  findPuzzle: (id: string) => Puzzle | undefined = getPuzzle,
): Encounter {
  const file = data as Partial<EncounterFile>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid encounter${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  if (typeof file.name !== 'string' || !file.name) fail('missing name');
  if (!KINDS.includes(file.kind as EncounterKind)) fail(`kind must be one of ${KINDS.join(', ')}`);
  const puzzle = typeof file.puzzle === 'string' ? findPuzzle(file.puzzle) : undefined;
  if (!puzzle) fail(`unknown puzzle "${file.puzzle}"`);
  return {
    id: file.id!,
    name: file.name!,
    kind: file.kind!,
    puzzle: puzzle!,
    ...(file.blurb ? { blurb: file.blurb } : {}),
    ...(file.kind === 'fight' ? { enemy: parseEnemy(file.enemy, puzzle!, fail) } : {}),
    ...(file.boss ? { boss: true } : {}),
    ...(file.scene !== undefined ? { scene: checkScene(file.scene, fail) } : {}),
  };
}

export function parseRun(
  data: unknown,
  findEncounter: (id: string) => Encounter | undefined,
): RunDef {
  const file = data as Partial<RunFile>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid run${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  if (typeof file.name !== 'string' || !file.name) fail('missing name');
  if (!Number.isInteger(file.hp) || file.hp! < 1) fail('hp must be a positive integer');
  if (!Array.isArray(file.encounters) || file.encounters.length === 0) fail('needs encounters');
  const encounters = file.encounters!.map(
    (id) => findEncounter(id) ?? fail(`unknown encounter "${id}"`),
  );
  const gadgets = file.gadgets ?? [];
  if (!Array.isArray(gadgets)) fail('gadgets must be a list');
  for (const g of gadgets) if (!getGadget(g)) fail(`unknown gadget "${g}"`);
  for (const key of ['intro', 'outro'] as const) {
    const id = file[key];
    if (id !== undefined && !getScene(id)) fail(`unknown ${key} scene "${id}"`);
  }
  return {
    id: file.id!,
    name: file.name!,
    hp: file.hp!,
    encounters,
    gadgets,
    ...(file.intro ? { intro: file.intro } : {}),
    ...(file.outro ? { outro: file.outro } : {}),
  };
}

const encounterFiles = import.meta.glob<{ default: unknown }>('./encounters/*.json', {
  eager: true,
});
const runFiles = import.meta.glob<{ default: unknown }>('./runs/*.json', { eager: true });

const encountersById = new Map<string, Encounter>();
for (const mod of Object.values(encounterFiles)) {
  const encounter = parseEncounter(mod.default);
  encountersById.set(encounter.id, encounter);
}

const runsById = new Map<string, RunDef>();
for (const mod of Object.values(runFiles)) {
  const run = parseRun(mod.default, (id) => encountersById.get(id));
  runsById.set(run.id, run);
}

/** The run the "Start a run" button begins. */
export const DEFAULT_RUN_ID = 'first-job';

export function getRun(id: string): RunDef | undefined {
  return runsById.get(id);
}

export const runs: RunDef[] = [...runsById.values()];
