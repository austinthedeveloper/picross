import { getPuzzle } from '@picross/grid/puzzles/index';
import type { Enemy } from '../game/battle';
import { parseEnemy } from './enemies';
import type { Puzzle } from '@picross/grid/puzzles/format';
import { encounterFiles } from '@picross/story/puzzles/files/encounters';
import { runFiles } from '@picross/story/puzzles/files/runs';
import {
  checkRunLinks,
  parseEncounter as parseStoryEncounter,
  parseRun as parseStoryRun,
  type EncounterFile as StoryEncounterFile,
  type StoryEncounter,
  type StoryRun,
} from '@picross/story/puzzles/runs';

/**
 * The story's encounters and jobs (read and checked in `@picross/story`) on a flat board:
 * each encounter's 2D puzzle, and its enemy checked against that puzzle (`enemies.ts`).
 */

export {
  REST_LATE_HEAL,
  restHeal,
  type EncounterKind,
  type Rest,
  type RunFile,
} from '@picross/story/puzzles/runs';

export type EncounterFile = StoryEncounterFile<Enemy>;

export type Encounter = StoryEncounter<Puzzle, Enemy> & {
  /**
   * An Endless fight played on a block (#158): the story encounter whose enemy fights there
   * (`of`), how many fights came before (`fight`, which scales it) and how many on a block
   * (`nth`, which picks the block's band, `puzzles/endlessBlocks.ts`).
   */
  onBlock?: { of: string; fight: number; nth: number; seed: number };
};

export interface RunDef extends StoryRun<Encounter> {
  /** Endless mode (#68): never won; `encounters` is only the stretch around you. */
  endless?: boolean;
}

export function parseEncounter(
  data: unknown,
  findPuzzle: (id: string) => Puzzle | undefined = getPuzzle,
): Encounter {
  return parseStoryEncounter(data, { puzzle: findPuzzle, enemy: parseEnemy });
}

export function parseRun(
  data: unknown,
  findEncounter: (id: string) => Encounter | undefined,
): RunDef {
  return parseStoryRun(data, findEncounter);
}

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

/** Every encounter, including ones no job uses yet (the debug panel can still start them). */
export const encounters: Encounter[] = [...encountersById.values()];

export function getRun(id: string): RunDef | undefined {
  return runsById.get(id);
}

checkRunLinks(runsById);

/** Every job, in jobs-board order. */
export const runs: RunDef[] = [...runsById.values()]
  .filter((run) => !run.overtimeOf && !run.bossOf)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name));

/** Harder replays of cleared jobs (#113). */
export const overtimeRuns: RunDef[] = [...runsById.values()].filter((run) => run.overtimeOf);

/** A job's Overtime, if it has one. */
export const overtimeFor = (job: string) => overtimeRuns.find((run) => run.overtimeOf === job);

/** Standalone boss fights, each unlocked by clearing a job. */
export const bossFights: RunDef[] = [...runsById.values()].filter((run) => run.bossOf);

/** The boss fights a cleared job unlocks. */
export const bossFightsFor = (job: string) => bossFights.filter((run) => run.bossOf === job);
