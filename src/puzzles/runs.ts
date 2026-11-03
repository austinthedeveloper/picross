import { getPuzzle } from './index';
import type { Enemy } from '../game/battle';
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
  if (enemy.fog !== undefined) {
    const { rows = [], cols = [] } = enemy.fog as Partial<Enemy['fog'] & object>;
    const inRange = (list: unknown, size: number) =>
      Array.isArray(list) && list.every((i) => Number.isInteger(i) && i >= 0 && i < size);
    if (!inRange(rows, puzzle.height) || !inRange(cols, puzzle.width)) {
      fail('fog rows and cols must be line indexes within the puzzle');
    }
    parsed.fog = { rows: [...rows], cols: [...cols] };
  }
  return parsed;
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
