import { getPuzzle } from './index';
import type { Enemy } from '../game/battle';
import type { Puzzle } from './format';

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
}

export interface Encounter extends Omit<EncounterFile, 'puzzle'> {
  puzzle: Puzzle;
}

function parseEnemy(data: unknown, fail: (msg: string) => never): Enemy {
  const enemy = data as Partial<Enemy> | undefined;
  if (!enemy || typeof enemy !== 'object') return fail('fights need an enemy');
  if (typeof enemy.name !== 'string' || !enemy.name) fail('enemy needs a name');
  if (!Number.isInteger(enemy.hp) || enemy.hp! < 1) fail('enemy hp must be a positive integer');
  if (!Number.isInteger(enemy.attack) || enemy.attack! < 0) {
    fail('enemy attack must be a whole number');
  }
  return {
    name: enemy.name!,
    sprite: typeof enemy.sprite === 'string' ? enemy.sprite : '👾',
    hp: enemy.hp!,
    attack: enemy.attack!,
  };
}

/** A run: an ordered path of encounters. */
export interface RunFile {
  id: string;
  name: string;
  /** Player HP at the start of the run. */
  hp: number;
  encounters: string[];
}

export interface RunDef extends Omit<RunFile, 'encounters'> {
  encounters: Encounter[];
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
    ...(file.kind === 'fight' ? { enemy: parseEnemy(file.enemy, fail) } : {}),
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
  return { id: file.id!, name: file.name!, hp: file.hp!, encounters };
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
