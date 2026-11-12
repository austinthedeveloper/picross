/**
 * Sets of rows and columns. Several mechanics mark whole lines: fog hides their
 * clues (#30), scrambles hide their order (#49), and armor makes them weak
 * points (#50). Each one clears from a line when you complete that line.
 */
export type LineKind = 'row' | 'col';

export interface Line {
  kind: LineKind;
  index: number;
}

export interface LineSet {
  rows: number[];
  cols: number[];
}

export const noLines = (): LineSet => ({ rows: [], cols: [] });

export const lineCount = (set: LineSet) => set.rows.length + set.cols.length;

export const hasLine = (set: LineSet, kind: LineKind, index: number) =>
  (kind === 'row' ? set.rows : set.cols).includes(index);

/** The set without one line: what's left after you complete it. */
export function removeLine(set: LineSet, kind: LineKind, index: number): LineSet {
  return kind === 'row'
    ? { rows: set.rows.filter((i) => i !== index), cols: set.cols }
    : { rows: set.rows, cols: set.cols.filter((i) => i !== index) };
}

/** A compact id for a line, e.g. "r3" or "c0" (used for lines that have dealt damage). */
export const lineKey = (kind: LineKind, index: number) => `${kind[0]}${index}`;

export const keyToLine = (key: string): Line => ({
  kind: key[0] === 'r' ? 'row' : 'col',
  index: Number(key.slice(1)),
});

export const lineKeys = (set: LineSet) => [
  ...set.rows.map((i) => lineKey('row', i)),
  ...set.cols.map((i) => lineKey('col', i)),
];

/** The lines in `before` that are gone from `after`. */
export const linesRemoved = (before: LineSet, after: LineSet): Line[] => [
  ...before.rows
    .filter((i) => !after.rows.includes(i))
    .map((index) => ({ kind: 'row' as const, index })),
  ...before.cols
    .filter((i) => !after.cols.includes(i))
    .map((index) => ({ kind: 'col' as const, index })),
];

/** Every line in any of the sets. */
export function unionLines(sets: (LineSet | undefined)[]): LineSet {
  const present = sets.filter((s): s is LineSet => Boolean(s));
  const union = (key: 'rows' | 'cols') => [...new Set(present.flatMap((s) => s[key]))];
  return { rows: union('rows'), cols: union('cols') };
}
