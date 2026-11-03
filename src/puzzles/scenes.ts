/**
 * Scenes (#22): short dialogue between puzzles, written as JSON in
 * src/puzzles/scenes/. A scene has a cast and named nodes. Each node plays
 * its lines in order, then offers choices, jumps to `next`, or ends.
 */

/** A condition on a scene flag: "won" is true when the flag is set, "!won" when it isn't. */
export type Condition = string;

export interface CastMember {
  name: string;
  /** Placeholder art until #25: an emoji. */
  portrait: string;
}

export interface Line {
  /** Cast id. Leave out for narration. */
  who?: string;
  text: string;
  if?: Condition;
}

export interface Choice {
  text: string;
  /** Node to go to. Leave out to end the scene. */
  next?: string;
  /** Flags to set when chosen. */
  set?: Record<string, boolean>;
  if?: Condition;
}

export interface SceneNode {
  lines?: Line[];
  choices?: Choice[];
  /** Node to go to after the lines when there are no choices. */
  next?: string;
}

export interface Scene {
  id: string;
  cast: Record<string, CastMember>;
  /** First node; defaults to "start". */
  start: string;
  nodes: Record<string, SceneNode>;
}

export function parseScene(data: unknown): Scene {
  const file = data as Partial<Scene>;
  const fail = (msg: string): never => {
    throw new Error(`Invalid scene${file?.id ? ` "${file.id}"` : ''}: ${msg}`);
  };
  if (typeof file?.id !== 'string' || !file.id) fail('missing id');
  const cast = file.cast ?? {};
  for (const [id, member] of Object.entries(cast)) {
    if (!member?.name || !member.portrait) fail(`cast member "${id}" needs a name and portrait`);
  }
  const nodes = file.nodes;
  if (!nodes || typeof nodes !== 'object' || !Object.keys(nodes).length) fail('needs nodes');
  const start = file.start ?? 'start';
  const target = (from: string, next: unknown) => {
    if (next !== undefined && (typeof next !== 'string' || !nodes![next])) {
      fail(`node "${from}" goes to unknown node "${String(next)}"`);
    }
  };
  if (!nodes![start]) fail(`start node "${start}" doesn't exist`);
  for (const [id, node] of Object.entries(nodes!)) {
    for (const line of node.lines ?? []) {
      if (typeof line?.text !== 'string' || !line.text)
        fail(`node "${id}" has a line with no text`);
      if (line.who !== undefined && !cast[line.who]) {
        fail(`node "${id}" has a line from unknown speaker "${line.who}"`);
      }
    }
    for (const choice of node.choices ?? []) {
      if (typeof choice?.text !== 'string' || !choice.text) fail(`node "${id}" has a blank choice`);
      target(id, choice.next);
    }
    target(id, node.next);
    if (!node.lines?.length && !node.choices?.length) fail(`node "${id}" is empty`);
  }
  return { id: file.id!, cast, start, nodes: nodes! };
}

const files = import.meta.glob<{ default: unknown }>('./scenes/*.json', { eager: true });
const byId = new Map<string, Scene>();
for (const mod of Object.values(files)) {
  const scene = parseScene(mod.default);
  byId.set(scene.id, scene);
}

export function getScene(id: string): Scene | undefined {
  return byId.get(id);
}

export const scenes = [...byId.values()];
