/** What a gadget does when used in a fight. Gadgets never change your marks. */
export type GadgetEffect =
  /** Damages the enemy right away (chip rules: never below 1 HP). */
  | { kind: 'damage'; amount: number }
  /** Blocks the next `hits` enemy hits. */
  | { kind: 'shield'; hits: number }
  /** Wipes every bit of ink off the board (#67). */
  | { kind: 'wash' };

/** An item a solved picture turns into, kept for the rest of a run (#28). */
export interface Gadget {
  id: string;
  name: string;
  /** Stands for the gadget's art in text (see withArt); the art itself is found by id. */
  icon: string;
  /** One line shown on the map and in fights. */
  description: string;
  effect: GadgetEffect;
}

export const catalog: Gadget[] = [
  {
    id: 'bomb',
    name: 'Bomb',
    icon: '💣',
    description: 'Throw it in a fight for 5 damage.',
    effect: { kind: 'damage', amount: 5 },
  },
  {
    id: 'patch-kit',
    name: 'Patch kit',
    icon: '🩹',
    description: 'Use in a fight to block the next hit.',
    effect: { kind: 'shield', hits: 1 },
  },
  {
    id: 'sponge',
    name: 'Sponge',
    icon: '🧽',
    description: 'Use in a fight to wipe all the ink off the board.',
    effect: { kind: 'wash' },
  },
];

const byId = new Map(catalog.map((g) => [g.id, g]));

export function getGadget(id: string): Gadget | undefined {
  return byId.get(id);
}
