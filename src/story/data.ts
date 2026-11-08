import { getGadget } from '../puzzles/gadgets';
import type { Puzzle } from '../puzzles/format';
import { getStoryPuzzle } from '../puzzles/index';
import { getScene } from '../puzzles/scenes';

/**
 * The story, read from the 2D game's data (shared verbatim by `npm run sync:web`) and
 * fitted to blocks. The 2D game's enemies name the exact rows and columns their powers
 * hit; a block has different lines, so here each power keeps only its size ("fog over 5
 * lines"), and the fight picks lines on the block (src/game/battle.ts).
 *
 * Anything the 2D data uses that this game can't play yet is collected in `storyIssues`
 * instead of failing the whole app; `story.test.ts` fails while there are any, which is
 * the import's compatibility gate (docs/story.md).
 */

export type EncounterKind = 'fight' | 'dig' | 'rest';

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

export interface Rest {
  seconds: number;
  heal: number;
}

/** HP a rest stop still gives when you finish after its timer. */
export const REST_LATE_HEAL = 1;
export const restHeal = (rest: Rest, elapsed: number) =>
  elapsed <= rest.seconds * 1000 ? rest.heal : REST_LATE_HEAL;

export interface Encounter {
  id: string;
  name: string;
  kind: EncounterKind;
  puzzle: Puzzle;
  blurb?: string;
  enemy?: Enemy;
  boss?: boolean;
  scene?: string;
  rest?: Rest;
  /** The gadget a dig's find becomes (from the 2D puzzle's `gadget`). */
  gadget?: string;
}

export interface Job {
  id: string;
  name: string;
  hp: number;
  encounters: Encounter[];
  gadgets: string[];
  intro?: string;
  outro?: string;
  blurb?: string;
  order: number;
  requires?: string;
  overtimeOf?: string;
  bossOf?: string;
}

export interface Chapter {
  id: string;
  title: string;
  blurb?: string;
  order: number;
  /** 1-based, in board order. */
  number: number;
  jobs: Job[];
  opening?: string;
}

/** Things the 2D story uses that this game can't play (yet). */
export const storyIssues: string[] = [];

const load = <T>(files: Record<string, unknown>) =>
  Object.values(files).map((m) => (m as { default: T }).default);

const encounterFiles = load<Record<string, unknown>>(
  import.meta.glob('../puzzles/encounters/*.json', { eager: true }),
);
const runFiles = load<Record<string, unknown>>(
  import.meta.glob('../puzzles/runs/*.json', { eager: true }),
);
const chapterFiles = load<Record<string, unknown>>(
  import.meta.glob('../puzzles/chapters/*.json', { eager: true }),
);
/** The 2D puzzles the story uses, for their `gadget`. */
const runPuzzles = new Map(
  load<{ id: string; gadget?: string }>(
    import.meta.glob('../puzzles/run/*.json', { eager: true }),
  ).map((p) => [p.id, p]),
);

/** Fields this game reads; anything else in the 2D data is reported. */
const KNOWN = {
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

function parseEncounter(data: Record<string, unknown>): Encounter | null {
  const where = `encounter "${data.id}"`;
  unknownKeys('encounter', where, data);
  const puzzle = getStoryPuzzle(String(data.puzzle));
  if (!puzzle) {
    storyIssues.push(`${where}: no 3D puzzle "${data.puzzle}" in src/puzzles/story/`);
    return null;
  }
  const kind = data.kind as EncounterKind;
  if (!['fight', 'dig', 'rest'].includes(kind)) {
    storyIssues.push(`${where}: unknown kind "${kind}"`);
    return null;
  }
  if (typeof data.scene === 'string' && !getScene(data.scene)) {
    storyIssues.push(`${where}: unknown scene "${data.scene}"`);
  }
  const gadget = runPuzzles.get(String(data.puzzle))?.gadget;
  return {
    id: String(data.id),
    name: String(data.name),
    kind,
    puzzle,
    ...(data.blurb ? { blurb: String(data.blurb) } : {}),
    ...(kind === 'fight' && data.enemy
      ? { enemy: parseEnemy(data.enemy as Record<string, unknown>, where) }
      : {}),
    ...(data.boss ? { boss: true } : {}),
    ...(typeof data.scene === 'string' ? { scene: data.scene } : {}),
    ...(kind === 'rest' ? { rest: data.rest as Rest } : {}),
    ...(gadget && getGadget(gadget) ? { gadget } : {}),
  };
}

const encounters = new Map<string, Encounter>();
for (const file of encounterFiles) {
  const e = parseEncounter(file);
  if (e) encounters.set(e.id, e);
}

function parseJob(data: Record<string, unknown>): Job | null {
  const where = `job "${data.id}"`;
  unknownKeys('run', where, data);
  const list = (data.encounters as string[]).map((id) => {
    const e = encounters.get(id);
    if (!e) storyIssues.push(`${where}: encounter "${id}" isn't playable`);
    return e;
  });
  if (list.some((e) => !e)) return null;
  const gadgets = ((data.gadgets as string[]) ?? []).filter((g) => {
    if (getGadget(g)) return true;
    storyIssues.push(`${where}: unknown gadget "${g}"`);
    return false;
  });
  for (const key of ['intro', 'outro'] as const) {
    if (typeof data[key] === 'string' && !getScene(data[key] as string)) {
      storyIssues.push(`${where}: unknown ${key} scene "${data[key]}"`);
    }
  }
  return {
    id: String(data.id),
    name: String(data.name),
    hp: Number(data.hp),
    encounters: list as Encounter[],
    gadgets,
    order: Number(data.order ?? 999),
    ...Object.fromEntries(
      (['intro', 'outro', 'blurb', 'requires', 'overtimeOf', 'bossOf'] as const)
        .filter((k) => typeof data[k] === 'string')
        .map((k) => [k, data[k] as string]),
    ),
  };
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

/** Every chapter, in board order, holding its story jobs. */
export const chapters: Chapter[] = chapterFiles
  .map((data) => {
    unknownKeys('chapter', `chapter "${data.id}"`, data);
    const chapterJobs = (data.jobs as string[]).flatMap((id) => {
      const job = jobById.get(id);
      if (!job) storyIssues.push(`chapter "${data.id}": job "${id}" isn't playable`);
      return job ? [job] : [];
    });
    if (typeof data.opening === 'string' && !getScene(data.opening)) {
      storyIssues.push(`chapter "${data.id}": unknown opening scene "${data.opening}"`);
    }
    return {
      id: String(data.id),
      title: String(data.title),
      order: Number(data.order),
      jobs: chapterJobs,
      ...(data.blurb ? { blurb: String(data.blurb) } : {}),
      ...(typeof data.opening === 'string' ? { opening: data.opening } : {}),
    };
  })
  .sort((a, b) => a.order - b.order)
  .map((c, i) => ({ ...c, number: i + 1 }));
