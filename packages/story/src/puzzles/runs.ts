import { getGadget } from './gadgets';
import { getScene } from './scenes';

/**
 * Reading encounters (`encounters/*.json`) and runs, or jobs (`runs/*.json`), for any board.
 *
 * What's the same on every board is checked here: an encounter's id, name, kind, rest and
 * scene, and a run's HP, encounters, gadgets and scenes. What isn't is the game's: each
 * passes an `EncounterFit` with its own puzzle for the encounter (the 2D game a grid from
 * `run/`, Cubed a block) and its own reading of the enemy. The files themselves are globbed
 * in `files/`.
 */

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

/** An encounter's file. `E` is the enemy as a game reads it. */
export interface EncounterFile<E = unknown> {
  id: string;
  name: string;
  kind: EncounterKind;
  /** Id of the puzzle played in this encounter. */
  puzzle: string;
  /** One line of flavor shown on the run map. */
  blurb?: string;
  /** Required for fights. */
  enemy?: E;
  /** A boss node: stands out on the map (#42). */
  boss?: boolean;
  /** Scene played the first time you open this node (#42). */
  scene?: string;
  /** Required for rest stops (#77). */
  rest?: Rest;
}

/** An encounter with its puzzle (`P`) and enemy (`E`) on one board. */
export interface StoryEncounter<P, E> extends Omit<EncounterFile<E>, 'puzzle'> {
  puzzle: P;
}

/** How a game plays encounters: its puzzle for one, and its enemy for a fight. */
export interface EncounterFit<P, E> {
  /** The puzzle an encounter names, on this board (undefined: there isn't one). */
  puzzle: (id: string) => P | undefined;
  /** A fight's enemy (an object, as written), read and checked against its puzzle. */
  enemy: (data: unknown, puzzle: P, fail: (msg: string) => never) => E;
}

export const KINDS: EncounterKind[] = ['fight', 'dig', 'rest'];

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

/** Reads and checks an encounter's file, with the game's puzzle and enemy. Throws if it's bad. */
export function parseEncounter<P, E>(data: unknown, fit: EncounterFit<P, E>): StoryEncounter<P, E> {
  const file = data as Partial<EncounterFile>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid encounter${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  if (typeof file.name !== 'string' || !file.name) fail('missing name');
  if (!KINDS.includes(file.kind as EncounterKind)) fail(`kind must be one of ${KINDS.join(', ')}`);
  const puzzle = typeof file.puzzle === 'string' ? fit.puzzle(file.puzzle) : undefined;
  if (!puzzle) fail(`unknown puzzle "${file.puzzle}"`);
  const enemy = () => {
    if (!file.enemy || typeof file.enemy !== 'object') fail('fights need an enemy');
    return fit.enemy(file.enemy, puzzle!, fail);
  };
  return {
    id: file.id!,
    name: file.name!,
    kind: file.kind!,
    puzzle: puzzle!,
    ...(file.blurb ? { blurb: file.blurb } : {}),
    ...(file.kind === 'fight' ? { enemy: enemy() } : {}),
    ...(file.kind === 'rest' ? { rest: parseRest(file.rest, fail) } : {}),
    ...(file.boss ? { boss: true } : {}),
    ...(file.scene !== undefined ? { scene: checkScene(file.scene, fail) } : {}),
  };
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
  /**
   * The job that unlocks this standalone boss fight: one fight, outside the story. It
   * stays off the jobs board's own list and shows on that job's card once it's cleared.
   */
  bossOf?: string;
}

/** A run with its encounters (`Enc`, a game's) in order. */
export interface StoryRun<Enc> extends Omit<RunFile, 'encounters' | 'gadgets'> {
  encounters: Enc[];
  gadgets: string[];
}

/** Reads and checks a run's file, finding its encounters with `findEncounter`. Throws if it's bad. */
export function parseRun<Enc>(
  data: unknown,
  findEncounter: (id: string) => Enc | undefined,
): StoryRun<Enc> {
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
    ...(file.bossOf ? { bossOf: file.bossOf } : {}),
  };
}

/** Checks the jobs a run names (`requires`, `overtimeOf`, `bossOf`) are runs too. */
export function checkRunLinks(
  runsById: ReadonlyMap<string, Pick<RunFile, 'id' | 'requires' | 'overtimeOf' | 'bossOf'>>,
): void {
  for (const run of runsById.values()) {
    if (run.requires && !runsById.has(run.requires)) {
      throw new Error(`Invalid run "${run.id}": requires unknown job "${run.requires}"`);
    }
    if (run.overtimeOf && !runsById.has(run.overtimeOf)) {
      throw new Error(`Invalid run "${run.id}": overtime of unknown job "${run.overtimeOf}"`);
    }
    if (run.bossOf && !runsById.has(run.bossOf)) {
      throw new Error(`Invalid run "${run.id}": boss fight of unknown job "${run.bossOf}"`);
    }
  }
}
