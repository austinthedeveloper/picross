import type { CastMember, Choice, Condition, Scene } from '../puzzles/scenes';

/** Flags a scene can read in conditions and set with choices. */
export type Flags = Record<string, boolean>;

/** Where a scene is. Pure data; advance it with `advance` and `choose`. */
export interface DialogueState {
  node: string;
  /** Index of the current line in the node; past the end means "at the choices". */
  line: number;
  flags: Flags;
  ended: boolean;
}

/** What to show right now. */
export type DialogueStep =
  | { kind: 'line'; speaker?: CastMember & { id: string }; text: string }
  | { kind: 'choices'; choices: { text: string; index: number }[] }
  | { kind: 'end' };

export function check(condition: Condition | undefined, flags: Flags): boolean {
  if (!condition) return true;
  return condition.startsWith('!') ? !flags[condition.slice(1)] : Boolean(flags[condition]);
}

const visibleChoices = (choices: Choice[] = [], flags: Flags) =>
  choices
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => check(choice.if, flags));

/** Moves forward from `state` to the next thing that should show. */
function settle(scene: Scene, state: DialogueState): DialogueState {
  let { node, line } = state;
  // Bounded so a scene that loops on itself without lines can't hang.
  for (let hops = 0; hops < 1000; hops++) {
    const current = scene.nodes[node];
    const lines = current.lines ?? [];
    while (line < lines.length && !check(lines[line].if, state.flags)) line++;
    if (line < lines.length) return { ...state, node, line };
    if (visibleChoices(current.choices, state.flags).length) return { ...state, node, line };
    if (!current.next) return { ...state, node, line, ended: true };
    node = current.next;
    line = 0;
  }
  return { ...state, ended: true };
}

export function startDialogue(scene: Scene, flags: Flags = {}): DialogueState {
  return settle(scene, { node: scene.start, line: 0, flags: { ...flags }, ended: false });
}

export function currentStep(scene: Scene, state: DialogueState): DialogueStep {
  if (state.ended) return { kind: 'end' };
  const node = scene.nodes[state.node];
  const line = node.lines?.[state.line];
  if (line) {
    const speaker = line.who ? { id: line.who, ...scene.cast[line.who] } : undefined;
    return { kind: 'line', speaker, text: line.text };
  }
  return {
    kind: 'choices',
    choices: visibleChoices(node.choices, state.flags).map(({ choice, index }) => ({
      text: choice.text,
      index,
    })),
  };
}

/** Goes past the current line. Does nothing while choices are showing. */
export function advance(scene: Scene, state: DialogueState): DialogueState {
  if (currentStep(scene, state).kind !== 'line') return state;
  return settle(scene, { ...state, line: state.line + 1 });
}

/** Picks a choice by its index in the node's `choices`. */
export function choose(scene: Scene, state: DialogueState, index: number): DialogueState {
  const step = currentStep(scene, state);
  if (step.kind !== 'choices' || !step.choices.some((c) => c.index === index)) return state;
  const choice = scene.nodes[state.node].choices![index];
  const flags = { ...state.flags, ...choice.set };
  if (!choice.next) return { ...state, flags, ended: true };
  return settle(scene, { node: choice.next, line: 0, flags, ended: false });
}

/** Who's on stage, left to right, and who spoke last (most recent first). */
export interface Stage {
  cast: string[];
  recent: string[];
}

/** Most portraits that fit side by side on a phone. */
export const STAGE_SIZE = 3;

export const emptyStage: Stage = { cast: [], recent: [] };

/**
 * The stage after someone speaks. Characters walk on the first time they talk and keep their
 * place. When it's full, the newcomer takes the place of whoever has been quiet longest.
 */
export function speakOnStage(stage: Stage, id: string): Stage {
  if (stage.cast.includes(id)) {
    return { cast: stage.cast, recent: [id, ...stage.recent.filter((who) => who !== id)] };
  }
  if (stage.cast.length < STAGE_SIZE) {
    return { cast: [...stage.cast, id], recent: [id, ...stage.recent] };
  }
  const leaving = stage.recent[stage.recent.length - 1];
  return {
    cast: stage.cast.map((who) => (who === leaving ? id : who)),
    recent: [id, ...stage.recent.filter((who) => who !== leaving)],
  };
}
