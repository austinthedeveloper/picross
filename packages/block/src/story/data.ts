import type { Puzzle } from '../puzzles/format';
import { getStoryPuzzle } from '../puzzles/index';
import { chapterFiles as chapterModules } from '@picross/story/puzzles/files/chapters';
import { encounterFiles as encounterModules } from '@picross/story/puzzles/files/encounters';
import { runPuzzleFiles } from '@picross/story/puzzles/files/runPuzzles';
import { runFiles as runModules } from '@picross/story/puzzles/files/runs';
import { getGadget } from '@picross/story/puzzles/gadgets';
import { assembleChapters, parseChapter, type StoryChapter } from '@picross/story/puzzles/chapters';
import {
  parseEncounter as parseStoryEncounter,
  parseRun,
  type StoryEncounter,
  type StoryRun,
} from '@picross/story/puzzles/runs';

/**
 * The story (packages/story, the 2D game's story) fitted to blocks. `@picross/story` reads
 * and checks what every board shares (kinds, rests, scenes, gadgets, jobs and chapters) and
 * throws on anything broken; this adds each encounter's 3D puzzle and its enemy on a block.
 * The 2D game's enemies name the exact rows and columns their powers hit; a block has
 * different lines, so here each power keeps only its size ("fog over 5 lines"), and the
 * fight picks lines on the block (src/game/battle.ts).
 *
 * Anything the story uses that this game can't play yet (an encounter with no 3D puzzle, a
 * field it doesn't read) is collected in `storyIssues` and left out, instead of failing the
 * whole app. packages/story's `boards.test.ts` reports them (docs/cubed/story.md).
 */

export {
  REST_LATE_HEAL,
  restHeal,
  type EncounterKind,
  type Rest,
} from '@picross/story/puzzles/runs';

/** A power's size and settings, from the 2D enemy. */
export interface Enemy {
  name: string;
  sprite: string;
  hp: number;
  attack: number;
  /** Lines starting hidden under fog. */
  fog?: number;
  /** Lines whose clues start scrambled. */
  scramble?: number;
  /** Armor: only `targets` marked lines hurt it; it hits back for `attack`. */
  armor?: { targets: number; attack: number };
  /** Forged clues: `fakes` of `suspects` marked lines lie. */
  fakes?: { fakes: number; suspects: number };
  /** Lines finished per zap of the charge meter. */
  charge?: number;
  /** Lines finished per quarter turn of the block. */
  rotate?: number;
  phases?: Phase[];
}

export interface Phase {
  /** HP fraction it starts at. */
  at: number;
  name?: string;
  sprite?: string;
  attack?: number;
  taunt?: string;
  /** More fog: this many lines (the 2D phase's named lines, or its fogCount). */
  fog?: number;
  scramble?: number;
  swap?: boolean;
  /** Ink splashes and how many. */
  ink?: number;
  inkCount?: number;
  charge?: number;
  rotate?: number;
}

export interface Encounter extends StoryEncounter<Puzzle, Enemy> {
  /** The gadget a dig's find becomes (from the 2D puzzle's `gadget`). */
  gadget?: string;
}

export interface Job extends Omit<StoryRun<Encounter>, 'order'> {
  order: number;
}

export type Chapter = StoryChapter<Job>;

/** Things the story uses that this game can't play (yet). */
export const storyIssues: string[] = [];

const load = <T>(files: Record<string, unknown>) =>
  Object.values(files).map((m) => (m as { default: T }).default);

const encounterFiles = load<Record<string, unknown>>(encounterModules);
const runFiles = load<Record<string, unknown>>(runModules);
const chapterFiles = load<Record<string, unknown>>(chapterModules);
/** The 2D puzzles the story uses, for their `gadget`. */
const runPuzzles = new Map(
  load<{ id: string; gadget?: string; width: number; height: number }>(runPuzzleFiles).map((p) => [
    p.id,
    p,
  ]),
);

/** Fields this game reads; anything else in the story is reported. */
export const KNOWN = {
  encounter: ['id', 'name', 'kind', 'puzzle', 'blurb', 'enemy', 'boss', 'scene', 'rest'],
  enemy: [
    'name',
    'sprite',
    'hp',
    'attack',
    'fog',
    'scramble',
    'armor',
    'fakes',
    'suspects',
    'charge',
    'rotate',
    'phases',
  ],
  phase: [
    'at',
    'name',
    'sprite',
    'attack',
    'taunt',
    'fog',
    'fogCount',
    'swap',
    'scramble',
    'scrambleCount',
    'ink',
    'inkCount',
    'charge',
    'rotate',
    // Which board the phase plays on in the 2D story (a boss that switches dimension).
    // Here every fight is on a block, so it's read and ignored.
    'board',
  ],
  run: [
    'id',
    'name',
    'hp',
    'encounters',
    'gadgets',
    'intro',
    'outro',
    'blurb',
    'order',
    'requires',
    'overtimeOf',
    'bossOf',
  ],
  chapter: ['id', 'title', 'blurb', 'order', 'jobs', 'opening'],
};

function unknownKeys(kind: keyof typeof KNOWN, where: string, data: object) {
  for (const key of Object.keys(data)) {
    if (!KNOWN[kind].includes(key)) storyIssues.push(`${where}: unknown ${kind} field "${key}"`);
  }
}

/** How many lines a 2D line set names. */
const lineCount = (set: unknown) => {
  const { rows = [], cols = [] } = (set ?? {}) as { rows?: unknown[]; cols?: unknown[] };
  return rows.length + cols.length;
};

function parseEnemy(data: Record<string, unknown>, where: string): Enemy {
  unknownKeys('enemy', where, data);
  const enemy: Enemy = {
    name: String(data.name),
    sprite: typeof data.sprite === 'string' ? data.sprite : 'unknown',
    hp: Number(data.hp),
    attack: Number(data.attack),
  };
  if (data.fog) enemy.fog = lineCount(data.fog);
  if (data.scramble) enemy.scramble = lineCount(data.scramble);
  if (data.armor) {
    const armor = data.armor as { weakPoints?: unknown; attack?: number };
    enemy.armor = { targets: lineCount(armor.weakPoints), attack: Number(armor.attack ?? 0) };
  }
  if (data.fakes) {
    enemy.fakes = { fakes: lineCount(data.fakes), suspects: lineCount(data.suspects) };
  }
  if (data.charge !== undefined) enemy.charge = Number(data.charge);
  if (data.rotate !== undefined) enemy.rotate = Number(data.rotate);
  if (Array.isArray(data.phases)) {
    enemy.phases = data.phases.map((p: Record<string, unknown>, i: number) => {
      unknownKeys('phase', `${where} phase ${i + 1}`, p);
      const phase: Phase = { at: Number(p.at) };
      for (const key of ['name', 'sprite', 'taunt'] as const) {
        if (typeof p[key] === 'string') phase[key] = p[key] as string;
      }
      for (const key of ['attack', 'ink', 'inkCount', 'charge', 'rotate'] as const) {
        if (p[key] !== undefined) phase[key] = Number(p[key]);
      }
      const fog = lineCount(p.fog) + Number(p.fogCount ?? 0);
      if (fog) phase.fog = fog;
      const scramble = lineCount(p.scramble) + Number(p.scrambleCount ?? 0);
      if (scramble) phase.scramble = scramble;
      if (p.swap === true) phase.swap = true;
      return phase;
    });
  }
  return enemy;
}

function scaleEnemy(enemy: Enemy, puzzle: Puzzle, lines2d: number): Enemy {
  return { ...enemy, hp: Math.max(1, Math.round((enemy.hp * puzzle.lines.length) / lines2d)) };
}

function parseEncounter(data: Record<string, unknown>): Encounter | null {
  const where = `encounter "${data.id}"`;
  unknownKeys('encounter', where, data);
  if (!getStoryPuzzle(String(data.puzzle))) {
    storyIssues.push(`${where}: no 3D puzzle "${data.puzzle}" in src/puzzles/story/`);
    return null;
  }
  const flat = runPuzzles.get(String(data.puzzle));
  const gadget = flat?.gadget;
  // A block has more lines than the 2D board, so enemies get HP in proportion: the same
  // share of the fight goes by per line finished.
  const lines2d = flat ? flat.width + flat.height : 30;
  const encounter: Encounter = parseStoryEncounter(data, {
    puzzle: getStoryPuzzle,
    enemy: (enemy, puzzle) =>
      scaleEnemy(parseEnemy(enemy as Record<string, unknown>, where), puzzle, lines2d),
  });
  return { ...encounter, ...(gadget && getGadget(gadget) ? { gadget } : {}) };
}

const encounters = new Map<string, Encounter>();
for (const file of encounterFiles) {
  const e = parseEncounter(file);
  if (e) encounters.set(e.id, e);
}

/** An encounter by id, fitted to a block. */
export const getEncounter = (id: string) => encounters.get(id);

/** Every encounter and job in the story, playable here or not. */
const storyEncounterIds = new Set(encounterFiles.map((data) => String(data.id)));
const storyJobIds = new Set(runFiles.map((data) => String(data.id)));

function parseJob(data: Record<string, unknown>): Job | null {
  const where = `job "${data.id}"`;
  unknownKeys('run', where, data);
  // A job plays every encounter in turn, so one this game can't play leaves out the job.
  // (An encounter the story doesn't have at all is an error, from parseRun.)
  const unplayable = (Array.isArray(data.encounters) ? (data.encounters as string[]) : []).filter(
    (id) => !encounters.has(id) && storyEncounterIds.has(id),
  );
  for (const id of unplayable) storyIssues.push(`${where}: encounter "${id}" isn't playable`);
  if (unplayable.length) return null;
  const job = parseRun(data, (id) => encounters.get(id));
  return { ...job, order: job.order ?? 999 };
}

/** Every job, including Overtime runs and boss fights. */
export const jobs: Job[] = runFiles
  .map(parseJob)
  .filter((j): j is Job => j !== null)
  .sort((a, b) => a.order - b.order);
const jobById = new Map(jobs.map((j) => [j.id, j]));
export const getJob = (id: string) => jobById.get(id);

/** Harder replays of a job (Overtime), shown on its card once it's cleared. */
export const overtimeFor = (id: string) => jobs.filter((j) => j.overtimeOf === id);
/** Standalone boss fights a job unlocks. */
export const bossFightsFor = (id: string) => jobs.filter((j) => j.bossOf === id);

/** Every chapter, in board order, holding its story jobs this game can play. */
export const chapters: Chapter[] = assembleChapters(
  chapterFiles.map((data) => {
    unknownKeys('chapter', `chapter "${data.id}"`, data);
    return parseChapter(data, (id) => {
      const job = jobById.get(id);
      if (job || !storyJobIds.has(id)) return job;
      storyIssues.push(`chapter "${data.id}": job "${id}" isn't playable`);
      return null;
    });
  }),
  jobs.filter((j) => !j.overtimeOf && !j.bossOf),
);
