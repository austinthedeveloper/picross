/**
 * The JSON that goes out to be rewritten and comes back: one page or the whole game
 * in the same format, with open notes next to the lines they're about.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { badges } from '../../src/puzzles/badges';
import { getScene, parseScene, type Scene, type SceneNode } from '@picross/shared/puzzles/scenes';
import { isItem, SHARED, type Item, type Page } from './model';
import type { LocatedNote, Tag } from './notes';

export const FORMAT = 'picross-script';

const INSTRUCTIONS = [
  'This is the script of a picross puzzle game, in play order. Rewrite it however you are asked to, and return this whole document as JSON.',
  'Write in "text" fields. Each text item is one piece of writing: rewrite its "text" and keep its "key".',
  'Each scene is a conversation. You may rewrite, add, remove and reorder lines, and add or remove nodes and choices. A line\'s "who" must be a cast id; leave it out for narration. Every "next" must name a node in that scene.',
  'A line with "if": "won" only plays after a win, and "if": "!won" only after a loss. When a scene has both, keep both outcomes covered. Do not invent other conditions.',
  'You may add cast members, but "portrait" must be an existing art id from this document or a single emoji.',
  'Leave every "type", "key", "id", "base", "backdrop" and "label" as it is. Names and labels can\'t be changed here.',
  '"notes" are the author\'s comments on the line or section they sit on. "change" asks for a change, "question" asks you to think the point through, and "like" means keep what works about that line. Notes are ignored when this comes back, so you can leave them in.',
].join('\n');

export interface ExportNote {
  id: string;
  tag: Tag;
  body: string;
}

export interface TextItem {
  type: 'text';
  key: string;
  label?: string;
  speaker?: string;
  text: string;
  base: string;
  notes?: ExportNote[];
}

export interface SceneItem extends Scene {
  type: 'scene';
  base: string;
}

export interface ExportSection {
  eyebrow: string;
  title: string;
  notes?: ExportNote[];
  content: (TextItem | SceneItem)[];
}

export interface ExportDoc {
  format: typeof FORMAT;
  version: 1;
  instructions: string;
  pages: { slug: string; eyebrow: string; title: string; sections: ExportSection[] }[];
}

/** What a rewrite changes, compared with the script when it was imported. */
export interface Changes {
  texts: Record<string, string>;
  scenes: Record<string, Scene>;
  /** What each change was written from, by text key or scene id. */
  bases: Record<string, string>;
}

const fingerprint = (value: unknown) =>
  createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 10);

/** The fields a scene is made of and nothing else, always in the same order. */
export function canonicalScene(scene: Scene): Scene {
  const nodes: Record<string, SceneNode> = {};
  for (const [id, node] of Object.entries(scene.nodes)) {
    nodes[id] = {
      ...(node.lines?.length
        ? {
            lines: node.lines.map((line) => ({
              ...(line.who ? { who: line.who } : {}),
              text: line.text,
              ...(line.if ? { if: line.if } : {}),
            })),
          }
        : {}),
      ...(node.choices?.length
        ? {
            choices: node.choices.map((choice) => ({
              text: choice.text,
              ...(choice.next ? { next: choice.next } : {}),
              ...(choice.set ? { set: choice.set } : {}),
              ...(choice.if ? { if: choice.if } : {}),
            })),
          }
        : {}),
      ...(node.next ? { next: node.next } : {}),
    };
  }
  const cast = Object.fromEntries(
    Object.entries(scene.cast).map(([id, member]) => [
      id,
      { name: member.name, portrait: member.portrait },
    ]),
  );
  return {
    id: scene.id,
    ...(scene.backdrop ? { backdrop: scene.backdrop } : {}),
    cast,
    start: scene.start,
    nodes,
  };
}

const sceneBase = (scene: Scene) => fingerprint(canonicalScene(scene));
const textBase = (text: string) => fingerprint(text);

export const currentBase = (id: string, pages: Page[]): string | undefined => {
  const scene = getScene(id);
  if (scene) return sceneBase(scene);
  const text = textsOf(pages).get(id);
  return text === undefined ? undefined : textBase(text);
};

const sceneOfKey = (key: string) => (key.startsWith('scene/') ? key.split('/')[1] : undefined);

/** These are worked out from a job's name or a rank's points, so there's nothing to rewrite. */
const generated = new Set(badges.filter((b) => b.rule.kind === 'job').map((b) => `badge/${b.id}`));

const isWriting = (item: Item) =>
  !item.key.startsWith('rank/') && !generated.has(item.key) && !!item.text;

/** Every piece of writing outside scenes, by key. */
function textsOf(pages: Page[]): Map<string, string> {
  const texts = new Map<string, string>();
  for (const item of pages.flatMap((p) => p.sections.flatMap((s) => s.entries.filter(isItem)))) {
    if (!sceneOfKey(item.key) && isWriting(item)) texts.set(item.key, item.text);
  }
  return texts;
}

/** Builds the export for one page's slug, or for every page. Each thing appears once. */
export function buildExport(pages: Page[], notes: LocatedNote[], slug?: string): ExportDoc {
  const open = notes.filter((n) => !n.resolved && n.status !== 'removed');
  const notesOn = (key: string) => {
    const own = open
      .filter((n) => n.key === key)
      .map((n): ExportNote => ({ id: n.id, tag: n.tag, body: n.body }));
    return own.length ? { notes: own } : {};
  };

  const sceneItem = (scene: Scene): SceneItem => {
    const canonical = canonicalScene(scene);
    const nodes: Scene['nodes'] = {};
    for (const [nodeId, node] of Object.entries(canonical.nodes)) {
      const prefix = `scene/${scene.id}/${nodeId}`;
      nodes[nodeId] = {
        ...node,
        ...(node.lines
          ? { lines: node.lines.map((l, i) => ({ ...l, ...notesOn(`${prefix}/${i}`) })) }
          : {}),
        ...(node.choices
          ? {
              choices: node.choices.map((c, i) => ({ ...c, ...notesOn(`${prefix}/choice/${i}`) })),
            }
          : {}),
      };
    }
    return { type: 'scene', base: sceneBase(scene), ...canonical, nodes };
  };

  const seen = new Set<string>();
  const content = (entries: Page['sections'][number]['entries']) =>
    entries.filter(isItem).flatMap((item): ExportSection['content'] => {
      const sceneId = sceneOfKey(item.key);
      const id = sceneId ?? item.key;
      if (seen.has(id) || !isWriting(item)) return [];
      seen.add(id);
      if (sceneId) return [sceneItem(getScene(sceneId)!)];
      return [
        {
          type: 'text',
          key: item.key,
          ...(item.tag ? { label: item.tag } : {}),
          ...(item.speaker ? { speaker: item.speaker } : {}),
          text: item.text,
          base: textBase(item.text),
          ...notesOn(item.key),
        },
      ];
    });

  return {
    format: FORMAT,
    version: 1,
    instructions: INSTRUCTIONS,
    pages: pages
      .filter((page) => !slug || page.slug === slug)
      .map((page) => ({
        slug: page.slug,
        eyebrow: page.eyebrow,
        title: page.title,
        sections: page.sections
          .map((section) => ({
            eyebrow: section.eyebrow,
            title: section.title,
            ...notesOn(section.key),
            content: content(section.entries),
          }))
          .filter((section) => section.content.length),
      })),
  };
}

export interface ImportResult {
  changes: Changes;
  errors: string[];
  warnings: string[];
}

/** AI tools like to wrap JSON in a code fence, so that's accepted too. */
function parseDocument(raw: string): unknown {
  const fenced = raw.trim().match(/^```[a-z]*\s*\n([\s\S]*)\n```$/i);
  return JSON.parse(fenced ? fenced[1] : raw);
}

const portraitProblem = (id: string, portrait: string) =>
  /^[a-z0-9-]+$/.test(portrait) && !fs.existsSync(`${SHARED}/public/art/cast/${portrait}.png`)
    ? `cast member "${id}" uses art "${portrait}", which doesn't exist. Use existing art or an emoji.`
    : undefined;

const conditionsIn = (scene: Scene) =>
  Object.values(scene.nodes).flatMap((node) => [
    ...(node.lines ?? []).flatMap((l) => (l.if ? [l.if] : [])),
    ...(node.choices ?? []).flatMap((c) => (c.if ? [c.if] : [])),
  ]);

const flagsSetIn = (scene: Scene) =>
  Object.values(scene.nodes).flatMap((node) =>
    (node.choices ?? []).flatMap((c) => Object.keys(c.set ?? {})),
  );

/** Reads a rewrite and works out what it changes. Nothing is saved here. */
export function readImport(raw: string, pages: Page[]): ImportResult {
  const changes: Changes = { texts: {}, scenes: {}, bases: {} };
  const errors: string[] = [];
  const warnings: string[] = [];
  const result = () => ({ changes, errors, warnings });

  let doc: Partial<ExportDoc>;
  try {
    doc = parseDocument(raw) as Partial<ExportDoc>;
  } catch (error) {
    errors.push(`That isn't valid JSON: ${(error as Error).message}`);
    return result();
  }
  if (doc?.format !== FORMAT || !Array.isArray(doc.pages)) {
    errors.push(`That isn't a script export: expected "format": "${FORMAT}" and a list of pages.`);
    return result();
  }

  const current = textsOf(pages);
  const items = doc.pages.flatMap((page) =>
    (page?.sections ?? []).flatMap((section) => section?.content ?? []),
  );

  for (const item of items) {
    if (item?.type === 'text') {
      if (!current.has(item.key)) errors.push(`Unknown text key "${String(item.key)}".`);
      else if (typeof item.text !== 'string' || !item.text.trim()) {
        errors.push(`"${item.key}" has no text.`);
      } else if (item.text !== current.get(item.key)) {
        changes.texts[item.key] = item.text;
        changes.bases[item.key] = String(item.base ?? '');
      }
    } else if (item?.type === 'scene') {
      const original = getScene(item.id);
      if (!original) {
        errors.push(`Unknown scene "${String(item.id)}".`);
        continue;
      }
      try {
        // The backdrop is staging rather than writing, so a rewrite can't move it.
        const { backdrop } = original;
        const scene = canonicalScene(parseScene({ ...item, backdrop }));
        const problems = [
          ...Object.entries(scene.cast).map(([id, m]) => portraitProblem(id, m.portrait)),
          ...conditionsIn(scene).map((condition) => {
            const flag = condition.replace(/^!/, '');
            return flag === 'won' ||
              flagsSetIn(scene).includes(flag) ||
              flagsSetIn(original).includes(flag)
              ? undefined
              : `condition "${condition}" isn't one the game can set.`;
          }),
        ].filter(Boolean);
        for (const problem of problems) errors.push(`Scene "${item.id}": ${problem}`);
        if (problems.length) continue;
        for (const outcome of ['won', '!won']) {
          if (conditionsIn(original).includes(outcome) && !conditionsIn(scene).includes(outcome)) {
            warnings.push(
              `Scene "${item.id}" no longer has any "${outcome}" lines, so that outcome says less.`,
            );
          }
        }
        if (JSON.stringify(scene) !== JSON.stringify(canonicalScene(original))) {
          changes.scenes[item.id] = scene;
          changes.bases[item.id] = String(item.base ?? '');
        }
      } catch (error) {
        errors.push((error as Error).message);
      }
    } else {
      errors.push('Found content that is neither a text nor a scene.');
    }
  }

  const stale = Object.entries(changes.bases).filter(
    ([id, base]) => base !== currentBase(id, pages),
  );
  for (const [id] of stale) {
    warnings.push(`"${id}" has been edited since this was exported, so applying it needs --force.`);
  }
  return result();
}
