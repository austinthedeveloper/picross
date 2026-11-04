/**
 * Turns the game's writing into pages for the script review site. Everything is
 * read through the game's own modules, so pages follow the real play order and
 * new writing shows up without touching this file.
 */
import { chapters } from '../../src/puzzles/chapters';
import { catalog as gadgets } from '../../src/puzzles/gadgets';
import type { Encounter, RunDef } from '../../src/puzzles/runs';
import { getScene, scenes, type Scene } from '../../src/puzzles/scenes';
import { tutorialSteps } from '../../src/puzzles/tutorial';
import { POWERS } from '../../src/ui/powers';

/** Something you can leave a note on. */
export interface Item {
  /** Where this text lives, like "scene/first-job-intro/start/3". Notes attach to it. */
  key: string;
  kind: 'line' | 'narration' | 'taunt' | 'choice' | 'card';
  text: string;
  speaker?: string;
  /** Image path inside the site, or an emoji standing in for missing art. */
  art?: string;
  /** Small label: "If you win", "At 92% HP", "Map blurb". */
  tag?: string;
  /** For choices: the divider this one jumps to. Absent means it ends the scene. */
  jump?: string;
}

/** A break inside a scene, where a branch starts. */
export interface Divider {
  kind: 'divider';
  id: string;
  text: string;
}

export type Entry = Item | Divider;

export interface Section {
  id: string;
  /** Notes on this key are about the section as a whole. */
  key: string;
  /** A `lead` is one blurb at the top of a page, which needs no heading of its own. */
  kind: 'lead' | 'job' | 'scene' | 'encounter' | 'list';
  eyebrow: string;
  title: string;
  art?: string;
  /** Extra detail shown by the title, like a scene's id. */
  detail?: string;
  entries: Entry[];
}

export interface Page {
  slug: string;
  eyebrow: string;
  title: string;
  sections: Section[];
}

/** One noteable thing, flattened out of the pages. */
export interface Target {
  key: string;
  text: string;
  speaker?: string;
  page: string;
  pageTitle: string;
  section: string;
}

/** Art ids are file names; anything else is an emoji standing in (see src/ui/art.ts). */
const isArtId = (value: string) => /^[a-z0-9-]+$/.test(value);
const portrait = (value: string) => (isArtId(value) ? `art/cast/${value}.png` : value);
const sprite = (value: string) => (isArtId(value) ? `art/enemies/${value}.png` : value);

export const isItem = (entry: Entry): entry is Item => entry.kind !== 'divider';

const conditionLabel = (condition?: string) => {
  if (!condition) return undefined;
  if (condition === 'won') return 'If you win';
  if (condition === '!won') return 'If you lose';
  return condition.startsWith('!')
    ? `Only if not "${condition.slice(1)}"`
    : `Only if "${condition}"`;
};

/** Node ids in reading order: depth first from the start, following choices, then `next`. */
function nodeOrder(scene: Scene): string[] {
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = scene.nodes[id];
    for (const choice of node.choices ?? []) if (choice.next) visit(choice.next);
    if (node.next) visit(node.next);
  };
  visit(scene.start);
  // Nothing can reach these in the game, but they're still writing to review.
  for (const id of Object.keys(scene.nodes)) visit(id);
  return [...seen];
}

const branchId = (sceneId: string, node: string) => `branch-${sceneId}-${node}`;

function branchLabel(scene: Scene, id: string): string {
  const nodes = Object.entries(scene.nodes);
  const asked = nodes.flatMap(([, node]) =>
    (node.choices ?? []).filter((c) => c.next === id).map((c) => `“${c.text}”`),
  );
  const rejoins = nodes.filter(([, node]) => node.next === id).map(([from]) => from);
  if (!asked.length && !rejoins.length) return `${id}: nothing leads here`;
  const parts = [
    ...(asked.length ? [`After ${asked.join(' or ')}`] : []),
    ...rejoins.map((from) => `${asked.length ? 'the' : 'The'} ${from} branch rejoins here`),
  ];
  return parts.join(', and ');
}

/** A scene's lines and choices, with dividers where it branches. */
export function sceneEntries(scene: Scene): Entry[] {
  return nodeOrder(scene).flatMap((nodeId): Entry[] => {
    const node = scene.nodes[nodeId];
    const prefix = `scene/${scene.id}/${nodeId}`;
    return [
      ...(nodeId === scene.start
        ? []
        : [
            {
              kind: 'divider' as const,
              id: branchId(scene.id, nodeId),
              text: branchLabel(scene, nodeId),
            },
          ]),
      ...(node.lines ?? []).map((line, i): Item => {
        const member = line.who ? scene.cast[line.who] : undefined;
        return {
          key: `${prefix}/${i}`,
          kind: member ? 'line' : 'narration',
          text: line.text,
          ...(member ? { speaker: member.name, art: portrait(member.portrait) } : {}),
          ...(line.if ? { tag: conditionLabel(line.if) } : {}),
        };
      }),
      ...(node.choices ?? []).map((choice, i): Item => ({
        key: `${prefix}/choice/${i}`,
        kind: 'choice',
        text: choice.text,
        speaker: 'You',
        ...(choice.if ? { tag: conditionLabel(choice.if) } : {}),
        ...(choice.next ? { jump: branchId(scene.id, choice.next) } : {}),
      })),
    ];
  });
}

function sceneSection(id: string, eyebrow: string, placed: Set<string>, owner: string): Section[] {
  const scene = getScene(id);
  if (!scene) return [];
  placed.add(id);
  return [
    {
      id: `${owner}-${id}`,
      key: `scene/${id}`,
      kind: 'scene',
      eyebrow,
      title: id,
      entries: sceneEntries(scene),
    },
  ];
}

/** The lines an enemy says as it changes phase, under whichever form it's in by then. */
function tauntEntries(encounter: Encounter): Item[] {
  const enemy = encounter.enemy;
  if (!enemy) return [];
  let name = enemy.name;
  let art = enemy.sprite;
  return (enemy.phases ?? []).flatMap((phase, i): Item[] => {
    name = phase.name ?? name;
    art = phase.sprite ?? art;
    if (!phase.taunt) return [];
    return [
      {
        key: `encounter/${encounter.id}/taunt/${i}`,
        kind: 'taunt',
        text: phase.taunt,
        speaker: name,
        art: sprite(art),
        tag: `At ${Math.round(phase.at * 100)}% HP`,
      },
    ];
  });
}

function encounterSection(encounter: Encounter, job: RunDef, placed: Set<string>): Section {
  const scene = encounter.scene ? getScene(encounter.scene) : undefined;
  if (scene) placed.add(scene.id);
  const taunts = tauntEntries(encounter);
  const kind =
    encounter.kind === 'fight' ? 'Fight' : encounter.kind === 'dig' ? 'Dig' : 'Rest stop';
  return {
    id: `${job.id}-${encounter.id}`,
    key: `encounter/${encounter.id}`,
    kind: 'encounter',
    eyebrow: encounter.boss ? `${kind} · Boss` : kind,
    title: encounter.name,
    ...(encounter.enemy ? { art: sprite(encounter.enemy.sprite) } : {}),
    ...(encounter.enemy && encounter.enemy.name !== encounter.name
      ? { detail: encounter.enemy.name }
      : {}),
    entries: [
      ...(encounter.blurb
        ? [
            {
              key: `encounter/${encounter.id}/blurb`,
              kind: 'card' as const,
              text: encounter.blurb,
              tag: 'Map blurb',
            },
          ]
        : []),
      ...(scene
        ? [
            { kind: 'divider' as const, id: `${job.id}-${scene.id}`, text: `Scene: ${scene.id}` },
            ...sceneEntries(scene),
          ]
        : []),
      ...(taunts.length
        ? [
            {
              kind: 'divider' as const,
              id: `${job.id}-${encounter.id}-taunts`,
              text: 'During the fight',
            },
            ...taunts,
          ]
        : []),
    ],
  };
}

function jobSections(job: RunDef, placed: Set<string>): Section[] {
  return [
    {
      id: `job-${job.id}`,
      key: `job/${job.id}`,
      kind: 'job',
      eyebrow: 'Job',
      title: job.name,
      entries: job.blurb
        ? [{ key: `job/${job.id}/blurb`, kind: 'card', text: job.blurb, tag: 'Jobs board blurb' }]
        : [],
    },
    ...(job.intro ? sceneSection(job.intro, 'Job intro', placed, job.id) : []),
    ...job.encounters.map((encounter) => encounterSection(encounter, job, placed)),
    ...(job.outro ? sceneSection(job.outro, 'Job sign-off', placed, job.id) : []),
  ];
}

const card = (key: string, tag: string, text: string): Item => ({ key, kind: 'card', tag, text });

const listSection = (id: string, title: string, entries: Entry[]): Section => ({
  id,
  key: `text/${id}`,
  kind: 'list',
  eyebrow: 'In-game text',
  title,
  entries,
});

/** Every page of the site: one per chapter in play order, then the text outside the story. */
export function buildPages(): Page[] {
  const placed = new Set<string>();
  const pages = chapters.map((chapter): Page => {
    const head: Section[] = chapter.blurb
      ? [
          {
            id: `chapter-${chapter.id}`,
            key: `chapter/${chapter.id}`,
            kind: 'lead',
            eyebrow: 'Jobs board',
            title: 'Chapter blurb',
            entries: [card(`chapter/${chapter.id}/blurb`, 'Jobs board blurb', chapter.blurb)],
          },
        ]
      : [];
    return {
      slug: `chapter-${chapter.number}-${chapter.id}`,
      eyebrow: `Chapter ${chapter.number}`,
      title: chapter.title,
      sections: [
        ...head,
        ...(chapter.opening
          ? sceneSection(chapter.opening, 'Chapter opening', placed, chapter.id)
          : []),
        ...chapter.jobs.flatMap((job) => jobSections(job, placed)),
      ],
    };
  });

  const unplaced = scenes.filter((scene) => !placed.has(scene.id));
  pages.push({
    slug: 'game-text',
    eyebrow: 'Outside the story',
    title: 'Tips, gadgets and tutorial',
    sections: [
      listSection(
        'power-tips',
        'Power tips',
        Object.entries(POWERS).map(([id, power]) => card(`power/${id}`, power.name, power.tip)),
      ),
      listSection(
        'gadgets',
        'Gadgets',
        gadgets.map((gadget) => card(`gadget/${gadget.id}`, gadget.name, gadget.description)),
      ),
      listSection(
        'tutorial',
        'How to play',
        tutorialSteps.map((step, i) => card(`tutorial/${i}`, step.title, step.text)),
      ),
      // Written but not hooked up to anything yet; better here than missing.
      ...unplaced.flatMap((scene) =>
        sceneSection(scene.id, 'Not used by the game yet', placed, 'unplaced'),
      ),
    ],
  });
  return pages;
}

/** Everything notes can attach to, in reading order, one per key. */
export function buildTargets(pages: Page[]): Target[] {
  const byKey = new Map<string, Target>();
  const add = (page: Page, section: Section, key: string, text: string, speaker?: string) => {
    if (byKey.has(key)) return;
    byKey.set(key, {
      key,
      text,
      ...(speaker ? { speaker } : {}),
      page: page.slug,
      pageTitle: `${page.eyebrow}: ${page.title}`,
      section: section.title,
    });
  };
  for (const page of pages) {
    for (const section of page.sections) {
      add(page, section, section.key, `${section.eyebrow}: ${section.title}`);
      for (const entry of section.entries.filter(isItem)) {
        add(page, section, entry.key, entry.text, entry.speaker);
      }
    }
  }
  return [...byKey.values()];
}

/** The file to edit for a key's text. */
export function sourceFile(key: string): string {
  const [kind, id] = key.split('/');
  const puzzles = 'src/puzzles';
  if (kind === 'scene') return `${puzzles}/scenes/${id}.json`;
  if (kind === 'encounter') return `${puzzles}/encounters/${id}.json`;
  if (kind === 'job') return `${puzzles}/runs/${id}.json`;
  if (kind === 'chapter') return `${puzzles}/chapters/${id}.json`;
  if (kind === 'power') return 'src/ui/powers.ts';
  if (kind === 'gadget') return `${puzzles}/gadgets.ts`;
  if (kind === 'tutorial') return `${puzzles}/tutorial.ts`;
  return '';
}
