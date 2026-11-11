import type { Dimension } from './ids';

/**
 * Calendar days for the daily puzzle (#69, #156). A day is a key, "YYYY-MM-DD", in the
 * player's own time zone, so the daily changes at their midnight. Counting and stepping
 * days goes through `dayNumber`, which has no time zone, so a clock change can't skip one.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** A local calendar date as "YYYY-MM-DD". */
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Days since 1970-01-01 for a "YYYY-MM-DD" key (time zone free). */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** The key for a day number: `keyOfDay(dayNumber(key))` is `key`. */
export function keyOfDay(day: number): string {
  const date = new Date(day * 86_400_000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** The key `n` days after `key` (before it, for a negative `n`). */
export const addDays = (key: string, n: number) => keyOfDay(dayNumber(key) + n);

/** The key for the day before. */
export const previousDay = (key: string) => addDays(key, -1);

/**
 * Which board a day's daily is on (#156): one daily a day, Flat on odd days and Cubed on even
 * ones, counted from the epoch (never the day of the month, which would put two Flat days
 * together at the end of a 31-day month).
 */
export const dailyDimension = (key: string): Dimension => (dayNumber(key) % 2 ? 'grid' : 'block');
