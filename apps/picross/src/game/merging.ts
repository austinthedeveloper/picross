import type { JobStats } from './runSave';

/**
 * The small pieces both save merges are built from: the cross-device one (`saveMerge.ts`,
 * two copies of one save) and the first-launch one (`legacyMerge.ts`, the two old games'
 * saves). No storage, no DOM, and no imports but types, so the migration that runs before
 * any store module can use them.
 */

export type Loose = Record<string, unknown>;

/** JSON with sorted keys, so two copies of the same data always compare equal. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)))
      : v,
  );
}

/** Whichever side, chosen the same way however they're ordered. */
export const either = <T>(a: T, b: T): T => (stable(a) >= stable(b) ? a : b);

/** One side if only one has it, and a merge if both do. */
export function combine<T>(
  a: T | undefined,
  b: T | undefined,
  merge: (a: T, b: T) => T,
): T | undefined {
  if (a === undefined) return b;
  return b === undefined ? a : merge(a, b);
}

export const higher = (a: number | undefined, b: number | undefined) => combine(a, b, Math.max);
export const lower = (a: number | undefined, b: number | undefined) => combine(a, b, Math.min);
export const union = <T extends string>(a: T[] | undefined, b: T[] | undefined) =>
  combine(a, b, (x, y) => [...new Set([...x, ...y])].sort());

/** Drops missing fields, so merging doesn't add `undefined` keys a save never had. */
export const present = <T extends object>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;

/**
 * The fields a rule doesn't know about, kept from both sides, so an older client
 * can't delete newer data. Rules then write their own fields over these.
 */
export function unknownFields(a: object, b: object): Loose {
  const x = a as Loose;
  const y = b as Loose;
  const out: Loose = {};
  for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
    out[key] = combine(x[key], y[key], either);
  }
  return out;
}

export function mergeRecord<T>(
  a: Record<string, T> | undefined,
  b: Record<string, T> | undefined,
  merge: (a: T, b: T) => T,
): Record<string, T> | undefined {
  return combine(a, b, (x, y) => {
    const out: Record<string, T> = {};
    for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
      out[key] = combine(x[key], y[key], merge)!;
    }
    return out;
  });
}

/** An older save's best HP may be from a Relaxed run, so a Hits-on side's best beats it. */
export function mergeBestHp(a: JobStats, b: JobStats): number | undefined {
  const trusted = [a, b].filter((job) => job.hitsOnWins);
  return (trusted.length ? trusted : [a, b])
    .map((job) => job.bestHp)
    .reduce((x, y) => higher(x, y));
}
