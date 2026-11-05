import { getPuzzle } from './index';
import type { Enemy } from '../game/battle';
import { parseEnemy } from './enemies';
import type { Puzzle } from './format';
import { getGadget } from './gadgets';
import { getScene } from './scenes';

/** What kind of node an encounter is: fights (#27), digs (#29), and rest stops (#77). */
export type EncounterKind = 'fight' | 'dig' | 'rest';

/** A rest stop (#77): solve within `seconds` to heal `heal` HP; finish late and heal less. */
export interface Rest {
  seconds: number;
  heal: number;
}

/** HP a rest stop still gives when you finish after the timer runs out. */
export const REST_LATE_HEAL = 1;

/** How much a rest stop heals for a solve that took `elapsed` ms. */
export const restHeal = (rest: Rest, elapsed: number) =>
  elapsed <= rest.seconds * 1000 ? rest.heal : REST_LATE_HEAL;

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
  /** Required for rest stops (#77). */
  rest?: Rest;
}

export interface Encounter extends Omit<EncounterFile, 'puzzle'> {
  puzzle: Puzzle;
}

function parseRest(data: unknown, fail: (msg: string) => never): Rest {
  const rest = data as Partial<Rest> | undefined;
  if (!rest || !Number.isInteger(rest.seconds) || rest.seconds! < 10) {
    return fail('rest stops need "rest": { "seconds": 10 or more, "heal": ... }');
  }
  if (!Number.isInteger(rest.heal) || rest.heal! <= REST_LATE_HEAL) {
    return fail(`a rest stop's heal must be more than ${REST_LATE_HEAL}`);
  }
  return { seconds: rest.seconds!, heal: rest.heal! };
}

function checkScene(id: unknown, fail: (msg: string) => never): string {
  if (typeof id !== 'string' || !getScene(id)) return fail(`unknown scene "${String(id)}"`);
  return id;
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
  /** Scene whose lines (picked by the `won` flag) sign off the results screen. */
  outro?: string;
  /** One line for the jobs board (#47). */
  blurb?: string;
  /** Position on the jobs board (lowest first). */
  order?: number;
  /** A job you must win once before this one unlocks. */
  requires?: string;
  /**
   * The job this is a harder replay of (#113). It stays off the jobs board's own list,
   * shows on that job's card once it's cleared, and always plays with Hits on.
   */
  overtimeOf?: string;
}

export interface RunDef extends Omit<RunFile, 'encounters' | 'gadgets'> {
  encounters: Encounter[];
  gadgets: string[];
  /** Endless mode (#68): never won; `encounters` is only the stretch around you. */
  endless?: boolean;
}

const KINDS: EncounterKind[] = ['fight', 'dig', 'rest'];

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
    ...(file.kind === 'rest' ? { rest: parseRest(file.rest, fail) } : {}),
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
    ...(file.blurb ? { blurb: file.blurb } : {}),
    ...(file.order !== undefined ? { order: file.order } : {}),
    ...(file.requires ? { requires: file.requires } : {}),
    ...(file.overtimeOf ? { overtimeOf: file.overtimeOf } : {}),
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

export function getEncounter(id: string): Encounter | undefined {
  return encountersById.get(id);
}

export function getRun(id: string): RunDef | undefined {
  return runsById.get(id);
}

for (const run of runsById.values()) {
  if (run.requires && !runsById.has(run.requires)) {
    throw new Error(`Invalid run "${run.id}": requires unknown job "${run.requires}"`);
  }
  if (run.overtimeOf && !runsById.has(run.overtimeOf)) {
    throw new Error(`Invalid run "${run.id}": overtime of unknown job "${run.overtimeOf}"`);
  }
}

/** Every job, in jobs-board order. */
export const runs: RunDef[] = [...runsById.values()]
  .filter((run) => !run.overtimeOf)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));

/** Harder replays of cleared jobs (#113). */
export const overtimeRuns: RunDef[] = [...runsById.values()].filter((run) => run.overtimeOf);

/** A job's Overtime, if it has one. */
export const overtimeFor = (job: string) => overtimeRuns.find((run) => run.overtimeOf === job);
